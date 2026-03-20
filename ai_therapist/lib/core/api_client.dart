/// api_client.dart (security-hardened)
/// ─────────────────────────────────────────────────────────────────────────
/// HTTP client that:
///   1. Attaches the JWT access token to every request automatically.
///   2. On 401, attempts a silent token refresh before retrying once.
///   3. Stores tokens in SecurePhiStorage (Keystore/Keychain) —
///      never in SharedPreferences or memory variables that survive hot restart.
///
/// pubspec.yaml dependencies:
///   http: ^1.2.1

library;

import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../../core/secure_phi_storage.dart';

// ─── Token storage keys ───────────────────────────────────────────────────────

const _kAccessToken = 'auth.access_token';
const _kRefreshToken = 'auth.refresh_token';

// ─── ApiClient ────────────────────────────────────────────────────────────────

class ApiClient {
  ApiClient._();
  static final ApiClient instance = ApiClient._();

  static const String _defaultProdUrl = 'https://aitherapistapp-production.up.railway.app';
  static const String _envBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: _defaultProdUrl,
  );

  static final String _baseUrl = () {
    String url = _envBaseUrl.trim();
    if (url.isEmpty) return _defaultProdUrl; // Failsafe if GitHub secret was empty
    
    if (url.endsWith('/')) url = url.substring(0, url.length - 1);
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://$url';
    }
    return url;
  }();

  final _store = SecurePhiStorage.instance;
  final _http = http.Client();

  // ─── Token storage ──────────────────────────────────────────────────────────

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _store.write(_kAccessToken, accessToken);
    await _store.write(_kRefreshToken, refreshToken);
  }

  Future<void> clearTokens() async {
    await _store.delete(_kAccessToken);
    await _store.delete(_kRefreshToken);
  }

  /// Decode the stored JWT payload and return the `role` claim string,
  /// or null if no token is stored or the payload is malformed.
  Future<String?> getStoredRole() async {
    final token = await _store.read(_kAccessToken);
    if (token == null) return null;
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      // JWT payload is base64url-encoded (no padding)
      final payload = parts[1];
      final normalized = base64Url.normalize(payload);
      final decoded = jsonDecode(utf8.decode(base64Url.decode(normalized))) as Map<String, dynamic>;
      return decoded['role'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<String?> get _accessToken => _store.read(_kAccessToken);
  Future<String?> get _refreshToken => _store.read(_kRefreshToken);

  // ─── Login ─────────────────────────────────────────────────────────────────

  Future<void> login(String email, String password) async {
    final response = await _http.post(
      Uri.parse('$_baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final body = jsonDecode(response.body) as Map<String, dynamic>;
      await saveTokens(
        accessToken: body['access_token'] as String,
        refreshToken: body['refresh_token'] as String,
      );
    } else if (response.statusCode == 401) {
      throw const ApiException(401, 'Invalid credentials.');
    } else {
      throw ApiException(response.statusCode, 'Login failed.');
    }
  }

  Future<void> logout() async {
    await clearTokens();
  }

  /// Public (unauthenticated) POST — used for registration etc.
  Future<http.Response> postPublic(String path, {Object? body}) async {
    final uri = Uri.parse('$_baseUrl$path');
    return _http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: body,
    );
  }

  // ─── Authenticated request with auto-refresh ────────────────────────────────

  Future<http.Response> get(String path) => _request('GET', path);

  Future<http.Response> post(String path, {Object? body}) =>
      _request('POST', path, body: body);

  Future<http.Response> delete(String path) => _request('DELETE', path);

  Future<http.Response> _request(
    String method,
    String path, {
    Object? body,
    bool isRetry = false,
  }) async {
    final token = await _accessToken;
    if (token == null) throw const ApiException(401, 'Not authenticated.');

    final uri = Uri.parse('$_baseUrl$path');
    final headers = {
      HttpHeaders.authorizationHeader: 'Bearer $token',
      HttpHeaders.contentTypeHeader: 'application/json',
    };

    final response = await _send(method, uri, headers, body);

    // If 401 and we haven't retried yet, attempt a silent token refresh
    if (response.statusCode == 401 && !isRetry) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        return _request(method, path, body: body, isRetry: true);
      }
      // Refresh failed — user must log in again
      await clearTokens();
      throw const ApiException(401, 'Session expired. Please log in again.');
    }

    return response;
  }

  Future<http.Response> _send(
    String method,
    Uri uri,
    Map<String, String> headers,
    Object? body,
  ) {
    final encodedBody = body != null ? jsonEncode(body) : null;
    switch (method) {
      case 'GET':
        return _http.get(uri, headers: headers);
      case 'POST':
        return _http.post(uri, headers: headers, body: encodedBody);
      case 'DELETE':
        return _http.delete(uri, headers: headers);
      default:
        throw ArgumentError('Unsupported HTTP method: $method');
    }
  }

  Future<bool> _tryRefresh() async {
    final refreshToken = await _refreshToken;
    if (refreshToken == null) return false;

    try {
      final response = await _http.post(
        Uri.parse('$_baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': refreshToken}),
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        await saveTokens(
          accessToken: body['access_token'] as String,
          refreshToken: body['refresh_token'] as String,
        );
        return true;
      }
    } catch (e) {
      debugPrint('Token refresh failed: $e');
    }
    return false;
  }

  // ─── Convenience JSON deserializer ──────────────────────────────────────────

  Future<T> getJson<T>(String path, T Function(dynamic) fromJson) async {
    final response = await get(path);
    _assertOk(response);
    return fromJson(jsonDecode(response.body));
  }

  Future<T> postJson<T>(
    String path, {
    Object? body,
    required T Function(dynamic) fromJson,
  }) async {
    final response = await post(path, body: body);
    _assertOk(response);
    return fromJson(jsonDecode(response.body));
  }

  void _assertOk(http.Response r) {
    if (r.statusCode < 200 || r.statusCode >= 300) {
      String detail = r.statusCode.toString();
      try {
        detail = (jsonDecode(r.body) as Map)['detail'] as String? ?? detail;
      } catch (_) {}
      throw ApiException(r.statusCode, detail);
    }
  }
}

// ─── Exception ────────────────────────────────────────────────────────────────

class ApiException implements Exception {
  final int statusCode;
  final String message;

  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}
