/// main.dart — Release 3
/// Wires all providers, initializes services, and gates the app behind
/// a real login screen connected to the Railway backend.

library;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'app/theme.dart';
import 'features/auth/auth_service.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/dashboard_provider.dart';
import 'features/dashboard/dashboard_screen_r2.dart';
import 'features/assessments/phq9_service.dart';
import 'features/patient_portal/patient_app.dart';
import 'core/notification_service.dart';

const bool _kFirebaseEnabled =
    bool.fromEnvironment('FIREBASE', defaultValue: false);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Firebase (guarded — needs google-services.json + flag)
  if (_kFirebaseEnabled) {
    // await Firebase.initializeApp();
  }

  await NotificationService.initialize();

  // 3. One-time PHI migration (SharedPreferences → SecurePhiStorage)
  //    Runs silently in background; app does not wait for it.
  Phq9Service.migrateFromSharedPreferences().catchError((_) {});

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
      ],
      child: const AiTherapistApp(),
    ),
  );
}

class AiTherapistApp extends StatelessWidget {
  const AiTherapistApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AI Therapist',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.colorfulTheme,
      darkTheme: AppTheme.clinicalDarkTheme,
      home: const AuthWrapper(),
    );
  }
}

/// Routes unauthenticated users to [LoginScreen] and authenticated
/// users to [DashboardScreen]. Shows a loading splash while
/// [AuthService] checks for a persisted token on first run.
class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, auth, _) {
        if (auth.isInitializing) {
          return const Scaffold(
            backgroundColor: Color(0xFF8FB9A8),
            body: Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),
          );
        }
        if (!auth.isAuthenticated) return const LoginScreen();
        // Route based on JWT role
        if (auth.userRole == 'patient') return const PatientApp();
        return const DashboardScreen(); // clinician / admin / supervisor
      },
    );
  }
}
