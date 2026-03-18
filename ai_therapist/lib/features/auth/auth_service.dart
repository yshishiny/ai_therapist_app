import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../core/secure_phi_storage.dart';

class AuthService with ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isInitializing = true;

  bool get isAuthenticated => _isAuthenticated;
  bool get isInitializing => _isInitializing;

  AuthService() {
    _checkStoredToken();
  }

  /// On startup, check whether a valid access token already exists in
  /// secure storage. This keeps the user logged in across app restarts.
  Future<void> _checkStoredToken() async {
    final token = await SecurePhiStorage.instance.read('auth.access_token');
    _isAuthenticated = token != null && token.isNotEmpty;
    _isInitializing = false;
    notifyListeners();
  }

  /// Call the real backend login endpoint and persist JWT tokens.
  /// Throws [ApiException] on invalid credentials or network error.
  Future<void> login(String email, String password) async {
    await ApiClient.instance.login(email, password);
    _isAuthenticated = true;
    notifyListeners();
  }

  /// Clear persisted tokens and update state.
  /// Called on explicit logout AND on 401 cascade (expired session).
  Future<void> logout() async {
    await ApiClient.instance.logout();
    _isAuthenticated = false;
    notifyListeners();
  }

  /// Called by screens/providers when they receive a 401 ApiException
  /// after a token refresh attempt has already failed.
  /// Clears auth state so AuthWrapper routes back to LoginScreen.
  void forceLogout() {
    ApiClient.instance.logout().then((_) {
      _isAuthenticated = false;
      notifyListeners();
    });
  }
}
