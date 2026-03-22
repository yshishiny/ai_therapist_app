import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_client.dart';

class PatientSessionsTab extends StatefulWidget {
  const PatientSessionsTab({super.key});

  @override
  State<PatientSessionsTab> createState() => _PatientSessionsTabState();
}

class _PatientSessionsTabState extends State<PatientSessionsTab> {
  List<Map<String, dynamic>> _sessions = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await ApiClient.instance.get('/me/sessions');
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body) as List<dynamic>;
        setState(() => _sessions = data.cast<Map<String, dynamic>>());
      } else {
        setState(() => _error = 'Could not load sessions (${resp.statusCode})');
      }
    } catch (e) {
      setState(() => _error = 'Network error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _requestAppointment() async {
    DateTime? preferredDate;
    final notesCtrl = TextEditingController();

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.only(
            left: 24, right: 24, top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Request a Session',
                  style: GoogleFonts.inter(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 20),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today, size: 16),
                label: Text(preferredDate == null
                    ? 'Choose preferred date'
                    : '${preferredDate!.year}-${preferredDate!.month.toString().padLeft(2,'0')}-${preferredDate!.day.toString().padLeft(2,'0')}'),
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: DateTime.now().add(const Duration(days: 1)),
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 90)),
                  );
                  if (picked != null) setModal(() => preferredDate = picked);
                },
              ),
              const SizedBox(height: 14),
              TextField(
                controller: notesCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Notes for your therapist (optional)',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8FB9A8),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    Navigator.pop(ctx);
                    try {
                      await ApiClient.instance.post(
                        '/me/sessions/request',
                        body: jsonEncode({
                          if (preferredDate != null)
                            'preferred_date':
                                '${preferredDate!.year}-${preferredDate!.month.toString().padLeft(2,'0')}-${preferredDate!.day.toString().padLeft(2,'0')}',
                          'notes': notesCtrl.text.trim(),
                        }),
                      );
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Session request sent to your therapist'),
                          backgroundColor: Color(0xFF8FB9A8),
                        ));
                      }
                      _load();
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Request failed: $e')));
                      }
                    }
                  },
                  child: const Text('Send Request',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FA),
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              child: Row(
                children: [
                  Text('Sessions',
                      style: GoogleFonts.inter(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF2D3748))),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Color(0xFF8FB9A8)),
                    onPressed: _load,
                  ),
                ],
              ),
            ),
            // Body
            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(
                          color: Color(0xFF8FB9A8)))
                  : _error != null
                      ? Center(child: Text(_error!,
                          style: const TextStyle(color: Colors.red)))
                      : _sessions.isEmpty
                          ? _EmptySessionsView(onRequest: _requestAppointment)
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _sessions.length,
                              itemBuilder: (_, i) =>
                                  _SessionCard(session: _sessions[i]),
                            ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _requestAppointment,
        backgroundColor: const Color(0xFF8FB9A8),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Request Session',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class _EmptySessionsView extends StatelessWidget {
  final VoidCallback onRequest;
  const _EmptySessionsView({required this.onRequest});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF8FB9A8).withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.event_outlined,
                  size: 48, color: Color(0xFF8FB9A8)),
            ),
            const SizedBox(height: 24),
            Text('No sessions yet',
                style: GoogleFonts.inter(
                    fontSize: 20, fontWeight: FontWeight.bold,
                    color: const Color(0xFF2D3748))),
            const SizedBox(height: 12),
            Text('Request a session with your therapist.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                    fontSize: 14, color: Colors.grey.shade600)),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: onRequest,
              icon: const Icon(Icons.add),
              label: const Text('Request Session'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8FB9A8),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(
                    horizontal: 24, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SessionCard extends StatelessWidget {
  final Map<String, dynamic> session;
  const _SessionCard({required this.session});

  @override
  Widget build(BuildContext context) {
    final date = session['session_date'] ?? session['created_at'] ?? '';
    final type = session['template'] ?? session['session_type'] ?? 'Session';
    final summary = session['ai_draft_summary'] ??
        session['subjective'] ?? 'No summary available';
    final displayDate = date.toString().length >= 10
        ? date.toString().substring(0, 10)
        : date.toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFF8FB9A8).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.event_note,
                color: Color(0xFF8FB9A8), size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(type,
                    style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF2D3748))),
                const SizedBox(height: 4),
                Text(displayDate,
                    style: GoogleFonts.inter(
                        fontSize: 12, color: Colors.grey.shade500)),
                const SizedBox(height: 8),
                Text(summary.toString(),
                    maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                        fontSize: 13, color: Colors.grey.shade700,
                        height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
