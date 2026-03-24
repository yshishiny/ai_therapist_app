/// fcm_service.dart
/// ─────────────────────────────────────────────────────────────────────────
/// Firebase Cloud Messaging service.
/// Handles:
///   - Requesting notification permission
///   - Obtaining + uploading the FCM device token to the backend
///   - Foreground message display via flutter_local_notifications
///   - Background / terminated message routing
///
/// Requires firebase_core to be initialized before calling [initialize].
/// Guard all calls with the _kFirebaseEnabled flag in main.dart.

library;

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'notification_service.dart';

// Background message handler — must be a top-level function
@pragma('vm:entry-point')
Future<void> _onBackgroundMessage(RemoteMessage message) async {
  // Show a local notification when the app is in the background/terminated
  final title = message.notification?.title ?? 'AI Therapist';
  final body = message.notification?.body ?? '';
  if (body.isNotEmpty) {
    await NotificationService.showReminder(title, body);
  }
}

class FcmService {
  FcmService._();
  static final FcmService instance = FcmService._();

  final _fcm = FirebaseMessaging.instance;

  /// Call once after Firebase.initializeApp().
  Future<void> initialize() async {
    // Register background handler
    FirebaseMessaging.onBackgroundMessage(_onBackgroundMessage);

    // Request permission (iOS prompts; Android 13+ prompts)
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    debugPrint('FCM permission: ${settings.authorizationStatus}');

    if (settings.authorizationStatus == AuthorizationStatus.denied) return;

    // Upload token to backend so the server can push to this device
    await _uploadToken();

    // Refresh token when it rotates
    _fcm.onTokenRefresh.listen(_sendTokenToBackend);

    // Foreground messages — show a local notification
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final title = message.notification?.title ?? 'AI Therapist';
      final body = message.notification?.body ?? '';
      if (body.isNotEmpty) {
        NotificationService.showReminder(title, body);
      }
    });

    // App opened from a notification tap (background → foreground)
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpen);

    // App launched from a terminated state via notification
    final initial = await _fcm.getInitialMessage();
    if (initial != null) _handleMessageOpen(initial);
  }

  Future<void> _uploadToken() async {
    final token = await _fcm.getToken();
    if (token != null) await _sendTokenToBackend(token);
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      await ApiClient.instance.post(
        '/me/fcm-token',
        body: {'fcm_token': token},
      );
      debugPrint('FCM token uploaded');
    } catch (e) {
      debugPrint('FCM token upload failed: $e');
    }
  }

  void _handleMessageOpen(RemoteMessage message) {
    // TODO: route to the relevant screen based on message.data['type']
    // e.g. 'homework' → patient homework tab, 'session' → calendar
    debugPrint('Notification tapped: ${message.data}');
  }
}
