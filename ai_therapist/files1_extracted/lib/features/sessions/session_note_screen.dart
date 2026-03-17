import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SessionNoteScreen extends StatefulWidget {
  final String patientName;

  const SessionNoteScreen({super.key, required this.patientName});

  @override
  State<SessionNoteScreen> createState() => _SessionNoteScreenState();
}

class _SessionNoteScreenState extends State<SessionNoteScreen> {
  final TextEditingController _noteController = TextEditingController();
  bool _isScribeActive = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Session with ${widget.patientName}',
            style: GoogleFonts.outfit()),
        actions: [
          IconButton(icon: const Icon(Icons.save), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          _buildScribeStatus(),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextField(
                controller: _noteController,
                maxLines: null,
                expands: true,
                decoration: const InputDecoration(
                  hintText:
                      'Start writing therapy notes or enable AI Scribe...',
                  border: InputBorder.none,
                ),
                style: const TextStyle(fontSize: 16, height: 1.5),
              ),
            ),
          ),
          _buildToolsBar(),
        ],
      ),
      bottomNavigationBar: _buildActionMenu(),
    );
  }

  Widget _buildScribeStatus() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: _isScribeActive ? Colors.red.shade50 : Colors.blue.shade50,
      child: Row(
        children: [
          Icon(
            _isScribeActive ? Icons.fiber_manual_record : Icons.mic_none,
            color: _isScribeActive ? Colors.red : Colors.blue,
            size: 16,
          ),
          const SizedBox(width: 8),
          Text(
            _isScribeActive
                ? 'AI Scribe Active - Transcribing...'
                : 'AI Scribe Ready',
            style: TextStyle(
              color: _isScribeActive ? Colors.red : Colors.blue,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
          const Spacer(),
          if (_isScribeActive)
            Text('00:45:22', style: GoogleFonts.robotoMono(fontSize: 12)),
        ],
      ),
    );
  }

  Widget _buildToolsBar() {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _buildToolBtn('SOAP'),
          _buildToolBtn('Themes'),
          _buildToolBtn('Risk Flag'),
          _buildToolBtn('Goals'),
          _buildToolBtn('Homework'),
        ],
      ),
    );
  }

  Widget _buildToolBtn(String label) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Center(
        child: ActionChip(
          label: Text(label, style: const TextStyle(fontSize: 11)),
          onPressed: () {},
          backgroundColor: Colors.grey.shade100,
        ),
      ),
    );
  }

  Widget _buildActionMenu() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.all(16),
        child: ElevatedButton(
          onPressed: () {
            setState(() {
              _isScribeActive = !_isScribeActive;
            });
          },
          style: ElevatedButton.styleFrom(
            backgroundColor:
                _isScribeActive ? Colors.grey : const Color(0xFF8FB9A8),
            minimumSize: const Size.fromHeight(50),
          ),
          child: Text(_isScribeActive ? 'Pause Session' : 'Start AI Scribe'),
        ),
      ),
    );
  }
}
