import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'features/auth/auth_service.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'app/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Note: Firebase initialization requires platform-specific configuration files (google-services.json/GoogleService-Info.plist)
  // await Firebase.initializeApp();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
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
      home: const DashboardScreen(), // Default to dashboard for development
    );
  }
}
