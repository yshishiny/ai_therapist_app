import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class CarePlanScreen extends StatelessWidget {
  const CarePlanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Phased Healing Roadmap', style: GoogleFonts.outfit()),
        actions: [
          IconButton(icon: const Icon(Icons.auto_awesome), onPressed: () {}),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildPhaseCard(
            'Phase 1: Stabilization',
            'Focus on safety, therapeutic alliance, and immediate symptom relief.',
            ['Weekly CBT', 'Basic Mindfulness', 'Sleep Hygiene'],
            Colors.blue.shade50,
            Colors.blue,
            true,
          ),
          _buildPhaseCard(
            'Phase 2: Core Processing',
            'Deep dive into trauma processing and cognitive restructuring.',
            ['EMDR Sessions', 'Thought Recording', 'Emotion Regulation'],
            Colors.purple.shade50,
            Colors.purple,
            false,
          ),
          _buildPhaseCard(
            'Phase 3: Consolidation',
            'Relapse prevention and building long-term resilience.',
            ['Future Planning', 'Resource Building', 'Bi-weekly Check-ins'],
            Colors.green.shade50,
            Colors.green,
            false,
          ),
        ],
      ),
    );
  }

  Widget _buildPhaseCard(String title, String desc, List<String> items, Color bg, Color accent, bool isActive) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(24),
        border: isActive ? Border.all(color: accent, width: 2) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold, color: accent)),
              const Spacer(),
              if (isActive) 
                const Chip(label: Text('ACTIVE', style: TextStyle(fontSize: 10, color: Colors.white)), backgroundColor: Colors.blue),
            ],
          ),
          const SizedBox(height: 12),
          Text(desc, style: TextStyle(color: Colors.grey.shade800, fontSize: 13, height: 1.5)),
          const SizedBox(height: 16),
          ...items.map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Icon(Icons.check_circle_outline, size: 16, color: accent),
                const SizedBox(width: 8),
                Text(item, style: const TextStyle(fontSize: 12)),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
