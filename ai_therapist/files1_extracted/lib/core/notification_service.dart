import 'package:flutter/material.dart';

class NotificationService {
  static Future<void> showReminder(String title, String body) async {
    // TODO: Implement FCM or Local Notifications
    debugPrint('Notification: $title - $body');
  }
}
