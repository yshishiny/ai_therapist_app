/// main.dart — Release 2
/// Wires all providers, initializes services, and runs the one-time
/// data migration from SharedPreferences → SecurePhiStorage on startup.

library;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'app/theme.dart';
import 'features/auth/auth_service.dart';
import 'features/dashboard/dashboard_provider.dart';
import 'features/dashboard/dashboard_screen_r2.dart';
import 'features/assessments/phq9_service.dart';
import 'features/calendar/scheduling_service.dart';

const bool _kFirebaseEnabled =
    bool.fromEnvironment('FIREBASE', defaultValue: false);

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Firebase (guarded — needs google-services.json + flag)
  if (_kFirebaseEnabled) {
    // await Firebase.initializeApp();
  }

  // 2. Notification service
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
      home: const DashboardScreen(),
    );
  }
}
