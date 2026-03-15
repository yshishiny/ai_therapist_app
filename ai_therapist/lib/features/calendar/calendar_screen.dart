import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class CalendarScreen extends StatelessWidget {
  const CalendarScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Clinical Calendar', style: GoogleFonts.outfit()),
        actions: [
          IconButton(icon: const Icon(Icons.add), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          _buildDayPicker(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _buildAppointmentItem('09:00 AM', 'Sarah Johnson', 'CBT Session', Colors.blue),
                _buildAppointmentItem('11:30 AM', 'Michael Chen', 'Initial Intake', Colors.orange),
                _buildAppointmentItem('02:00 PM', 'Ahmed Hassan', 'Crisis Follow-up', Colors.red),
                _buildAppointmentItem('04:30 PM', 'Laila Mahmoud', 'Weekly Check-in', Colors.green),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDayPicker() {
    return Container(
      height: 100,
      padding: const EdgeInsets.symmetric(vertical: 16),
      color: Colors.white,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: 7,
        itemBuilder: (context, index) {
          final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          final isToday = index == 2; // Mock Wednesday
          return Container(
            width: 60,
            margin: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              color: isToday ? const Color(0xFF8FB9A8) : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(days[index], style: TextStyle(color: isToday ? Colors.white : Colors.grey, fontSize: 12)),
                const SizedBox(height: 4),
                Text('${10 + index}', style: TextStyle(color: isToday ? Colors.white : Colors.black, fontWeight: FontWeight.bold)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildAppointmentItem(String time, String patient, String label, Color accent) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border(left: BorderSide(color: accent, width: 4)),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(time, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 4),
              const Text('Duration: 50m', style: TextStyle(color: Colors.grey, fontSize: 11)),
            ],
          ),
          const SizedBox(width: 24),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(patient, style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
                Text(label, style: TextStyle(color: accent, fontSize: 12)),
              ],
            ),
          ),
          const Icon(Icons.more_vert, color: Colors.grey),
        ],
      ),
    );
  }
}
