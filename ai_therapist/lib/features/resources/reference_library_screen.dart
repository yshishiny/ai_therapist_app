import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
// import 'package:url_launcher/url_launcher.dart'; // Uncomment if url_launcher is added

class ReferenceLibraryScreen extends StatelessWidget {
  const ReferenceLibraryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text('Reference Room', style: GoogleFonts.outfit()),
          bottom: const TabBar(
            indicatorColor: Color(0xFF6C63FF),
            labelColor: Color(0xFF6C63FF),
            tabs: [
              Tab(text: 'Guidelines'),
              Tab(text: 'Books'),
              Tab(text: 'Tools'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildGuidelinesTab(),
            _buildBooksTab(),
            _buildToolsTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildGuidelinesTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionHeader('Diagnostic Manuals'),
        _buildResourceCard(
            'DSM-5-TR',
            'Diagnostic and Statistical Manual of Mental Disorders',
            'American Psychiatric Association',
            Icons.menu_book,
            Colors.blue),
        _buildResourceCard('ICD-10', 'International Classification of Diseases',
            'World Health Organization', Icons.language, Colors.teal),
        const SizedBox(height: 24),
        _buildSectionHeader('Clinical Practice Guidelines'),
        _buildResourceCard(
            'APA Practice Guidelines',
            'Treatment of Major Depressive Disorder',
            '2019 Edition',
            Icons.description,
            Colors.indigo),
        _buildResourceCard('NICE Guidelines', 'Anxiety disorders in adults',
            'CG113', Icons.description, Colors.purple),
      ],
    );
  }

  Widget _buildBooksTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildSectionHeader('Core Texts'),
        _buildResourceCard('Cognitive Behavior Therapy', 'Basics and Beyond',
            'Judith S. Beck', Icons.book, Colors.orange),
        _buildResourceCard(
            'The Body Keeps the Score',
            'Brain, Mind, and Body in the Healing of Trauma',
            'Bessel van der Kolk',
            Icons.book,
            Colors.redAccent),
        _buildResourceCard('Motivational Interviewing', 'Helping People Change',
            'Miller & Rollnick', Icons.book, Colors.green),
      ],
    );
  }

  Widget _buildToolsTab() {
    return GridView.count(
      crossAxisCount: 2,
      padding: const EdgeInsets.all(16),
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.3,
      children: [
        _buildToolCard(
            'CBT Worksheet', 'Thought Record', Icons.edit_note, Colors.blue),
        _buildToolCard(
            'Safety Plan', 'Suicide Prevention', Icons.shield, Colors.red),
        _buildToolCard('Mindfulness', 'Guided Exercises',
            Icons.self_improvement, Colors.teal),
        _buildToolCard(
            'Medication', 'Interaction Checker', Icons.medication, Colors.pink),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: GoogleFonts.outfit(
            fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800]),
      ),
    );
  }

  Widget _buildResourceCard(String title, String subtitle, String author,
      IconData icon, Color color) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: () {
          // Future: Implement Open URL or PDF
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 4),
                    Text(subtitle,
                        style: const TextStyle(
                            fontSize: 13, color: Colors.black87)),
                    Text(author,
                        style:
                            const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
              const Icon(Icons.open_in_new, size: 16, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToolCard(
      String title, String subtitle, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 4,
                offset: const Offset(0, 2))
          ]),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(subtitle,
              style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
    );
  }
}
