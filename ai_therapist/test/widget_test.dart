import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ai_therapist/features/auth/auth_service.dart';
import 'package:ai_therapist/features/dashboard/dashboard_provider.dart';
import 'package:ai_therapist/app/theme.dart';
import 'package:ai_therapist/features/auth/login_screen.dart';
import 'package:ai_therapist/main.dart';

/// Stub the flutter_secure_storage platform channel so tests don't require
/// a real Android Keystore / iOS Keychain (would throw MissingPluginException).
void _mockSecureStorage() {
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(channel, (call) async {
    // read() returns null → no stored token → AuthService starts unauthenticated
    if (call.method == 'read') return null;
    // write/delete succeed silently
    return null;
  });
}

void main() {
  setUp(_mockSecureStorage);

  testWidgets('App shows LoginScreen when not authenticated', (tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthService()),
          ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ],
        child: MaterialApp(
          theme: AppTheme.colorfulTheme,
          home: const AuthWrapper(),
        ),
      ),
    );

    await tester.pumpAndSettle(const Duration(seconds: 2));

    // With no stored token the app must show LoginScreen, not Dashboard.
    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.text('Sign in to your account'), findsOneWidget);
  });
}
