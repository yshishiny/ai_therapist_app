import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class PatientDetailScreen extends StatelessWidget {
  final String patientName;
  final String patientId;

  const PatientDetailScreen({
    super.key,
    required this.patientName,
    required this.patientId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(patientName, style: GoogleFonts.outfit()),
        actions: [
          IconButton(icon: const Icon(Icons.edit), onPressed: () {}),
        ],
      ),
      body: DefaultTabController(
        length: 3,
        child: Column(
          children: [
            _buildProfileHeader(),
            const TabBar(
              labelColor: Color(0xFF8FB9A8),
              unselectedLabelColor: Colors.grey,
              indicatorColor: Color(0xFF8FB9A8),
              tabs: [
                Tab(text: 'Archive'),
                Tab(text: 'Trends'),
                Tab(text: 'Plan'),
              ],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _buildArchiveTab(),
                  _buildTrendsTab(),
                  _buildPlanTab(),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        label: const Text('New Session'),
        icon: const Icon(Icons.mic),
        backgroundColor: const Color(0xFF8FB9A8),
      ),
    );
  }

  Widget _buildProfileHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      color: Colors.white,
      child: Row(
        children: [
          CircleAvatar(
            radius: 35,
            backgroundColor: const Color(0xFF8FB9A8).withOpacity(0.1),
            child: Text(patientName[0], style: const TextStyle(fontSize: 24, color: Color(0xFF8FB9A8))),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(patientName, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
                const Text('Case ID: PSY-8829', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 8),
                const Wrap(
                  spacing: 8,
                  children: [
                    Chip(label: Text('Active', style: TextStyle(fontSize: 10))),
                    Chip(label: Text('GAD-7: 18 (Urgent)', style: TextStyle(fontSize: 10, color: Colors.red))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArchiveTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildFolderItem('Input (Raw Docs)', '4 Files', Icons.folder),
        _buildFolderItem('Processed (Cleaned)', '12 Files', Icons.folder_shared),
        _buildFolderItem('Output (Summaries)', '8 Files', Icons.folder_copy),
        _buildFolderItem('Reports', '3 PDF', Icons.picture_as_pdf),
      ],
    );
  }

  Widget _buildFolderItem(String title, String count, IconData icon) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFF8FB9A8)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
        subtitle: Text(count),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {},
      ),
    );
  }

  Widget _buildTrendsTab() {
    return const Center(child: Text('Clinical Charts & Trends (FL Chart)'));
  }

  Widget _buildPlanTab() {
    return const Center(child: Text('AI Phased Healing Roadmap'));
  }
}
