import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'features/auth/auth_service.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'app/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables
  await dotenv.load(fileName: ".env");

  // Attempt Firebase Initialization gracefully (requires google-services.json to be set up by developer)
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint("Firebase init failed (likely missing configuration): $e");
  }

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
      theme: ClinicalTheme.getTheme(false),
      darkTheme: ClinicalTheme.getTheme(true),
      home: const DashboardShell(), // Default to dashboard shell navigation
    );
  }
}
