import 'package:flutter/material.dart';

class AiTherapistApp extends StatelessWidget {
  const AiTherapistApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AI Therapist',
      debugShowCheckedModeBanner: false,
      home: const Scaffold(
        body: Center(
          child: Text('AI Therapist mobile scaffold'),
        ),
      ),
    );
  }
}
