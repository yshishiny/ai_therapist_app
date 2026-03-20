import 'package:flutter/material.dart';
import 'patient_home_tab.dart';
import 'patient_homework_tab.dart';
import 'patient_progress_tab.dart';
import 'patient_chat_tab.dart';

/// Root scaffold for the patient-facing experience.
/// Reached from AuthWrapper when the decoded JWT role == "patient".
class PatientApp extends StatefulWidget {
  const PatientApp({super.key});

  @override
  State<PatientApp> createState() => _PatientAppState();
}

class _PatientAppState extends State<PatientApp> {
  int _index = 0;

  static const _tabs = [
    PatientHomeTab(),
    PatientHomeworkTab(),
    PatientProgressTab(),
    PatientChatTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FA),
      body: IndexedStack(
        index: _index,
        children: _tabs,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFF8FB9A8).withValues(alpha: 0.15),
        onDestinationSelected: (i) => setState(() => _index = i),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: Color(0xFF8FB9A8)),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.task_outlined),
            selectedIcon: Icon(Icons.task, color: Color(0xFF8FB9A8)),
            label: 'Homework',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights, color: Color(0xFF8FB9A8)),
            label: 'Progress',
          ),
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble, color: Color(0xFF8FB9A8)),
            label: 'AI Chat',
          ),
        ],
      ),
    );
  }
}
