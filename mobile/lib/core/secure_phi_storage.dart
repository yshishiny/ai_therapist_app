/// secure_phi_storage.dart
/// ──────────────────────────────────────────────────────────────────────────
/// Encrypted key-value store for Protected Health Information (PHI).
///
/// Wraps flutter_secure_storage which uses:
///   Android — Android Keystore + EncryptedSharedPreferences (AES-256-GCM)
///   iOS     — Keychain Services
///
/// NEVER use SharedPreferences or Hive (unencrypted) for PHI.
///
/// pubspec.yaml dependency:
///   flutter_secure_storage: ^9.2.2
///
/// Android: minSdkVersion must be >= 18 in android/app/build.gradle
/// iOS: no changes needed (Keychain is available on all supported versions)

library;

import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// ─── Singleton ────────────────────────────────────────────────────────────────

class SecurePhiStorage {
  SecurePhiStorage._();
  static final SecurePhiStorage instance = SecurePhiStorage._();

  /// Android options: use EncryptedSharedPreferences backed by Keystore
  static const _androidOptions = AndroidOptions(
    encryptedSharedPreferences: true,
    // resetOnError: true — uncomment if you want to auto-clear on
    // Keystore errors (e.g. after factory reset). This deletes all data.
    // resetOnError: false,
  );

  /// iOS options: store in the keychain, accessible only when device is
  /// unlocked. Setting accessibility to first_unlock_this_device is the
  /// minimum required for background tasks; use unlocked_this_device if
  /// the app never needs background access to PHI.
  static const _iosOptions = IOSOptions(
    accessibility: KeychainAccessibility.unlocked_this_device,
  );

  final _storage = const FlutterSecureStorage(
    aOptions: _androidOptions,
    iOptions: _iosOptions,
  );

  // ─── Generic read / write ──────────────────────────────────────────────────

  Future<void> write(String key, String value) async {
    await _storage.write(
      key: key,
      value: value,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<String?> read(String key) async {
    return _storage.read(
      key: key,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<void> delete(String key) async {
    await _storage.delete(
      key: key,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<void> deleteAll() async {
    await _storage.deleteAll(
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  // ─── JSON helpers ──────────────────────────────────────────────────────────

  Future<void> writeJson(String key, Object value) async {
    await write(key, jsonEncode(value));
  }

  Future<T?> readJson<T>(
    String key,
    T Function(dynamic json) fromJson,
  ) async {
    final raw = await read(key);
    if (raw == null) return null;
    return fromJson(jsonDecode(raw));
  }

  // ─── List helpers (e.g. assessment history) ────────────────────────────────

  Future<void> appendToList(String key, Object item) async {
    final raw = await read(key);
    final list = raw != null ? jsonDecode(raw) as List<dynamic> : <dynamic>[];
    list.add(item);
    await write(key, jsonEncode(list));
  }

  Future<List<T>> readList<T>(
    String key,
    T Function(dynamic json) fromJson,
  ) async {
    final raw = await read(key);
    if (raw == null) return [];
    final list = jsonDecode(raw) as List<dynamic>;
    return list.map(fromJson).toList();
  }
}
