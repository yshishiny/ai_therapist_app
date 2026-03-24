import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/api_client.dart';
import '../careplan/careplan_screen.dart';
import '../sessions/session_note_screen.dart';
import 'patient_report_tab.dart';
import 'patient_trends_tab.dart';

class PatientDetailScreen extends StatefulWidget {
  final String patientName;
  final String patientId;

  const PatientDetailScreen({
    super.key,
    required this.patientName,
    required this.patientId,
  });

  @override
  State<PatientDetailScreen> createState() => _PatientDetailScreenState();
}

class _PatientDetailScreenState extends State<PatientDetailScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _patient;
  List<dynamic> _assessments = [];
  List<dynamic> _sessions = [];
  List<dynamic> _homework = [];
  List<dynamic> _carePlans = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final patientResp =
          await ApiClient.instance.get('/patients/${widget.patientId}');
      final assessmentsResp =
          await ApiClient.instance.get('/patients/${widget.patientId}/assessments');
      final sessionsResp =
          await ApiClient.instance.get('/patients/${widget.patientId}/sessions');
      final homeworkResp =
          await ApiClient.instance.get('/patients/${widget.patientId}/homework');
      final carePlansResp =
          await ApiClient.instance.get('/patients/${widget.patientId}/careplans');

      if (!mounted) return;

      setState(() {
        _patient = patientResp.statusCode == 200
            ? jsonDecode(patientResp.body) as Map<String, dynamic>
            : null;
        _assessments = assessmentsResp.statusCode == 200
            ? jsonDecode(assessmentsResp.body) as List<dynamic>
            : [];
        _sessions = sessionsResp.statusCode == 200
            ? jsonDecode(sessionsResp.body) as List<dynamic>
            : [];
        _homework = homeworkResp.statusCode == 200
            ? jsonDecode(homeworkResp.body) as List<dynamic>
            : [];
        _carePlans = carePlansResp.statusCode == 200
            ? jsonDecode(carePlansResp.body) as List<dynamic>
            : [];
        _error = _patient == null ? 'Unable to load patient details.' : null;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to load patient details.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final patient = _patient;

    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.patientName, style: GoogleFonts.inter()),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _load,
            ),
          ],
          bottom: const TabBar(
            labelColor: Color(0xFF8FB9A8),
            unselectedLabelColor: Colors.grey,
            indicatorColor: Color(0xFF8FB9A8),
            isScrollable: true,
            tabs: [
              Tab(text: 'Summary'),
              Tab(text: 'Trends'),
              Tab(text: 'AI Report'),
              Tab(text: 'Care Plan'),
            ],
          ),
        ),
        body: _loading
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xFF8FB9A8)),
              )
            : _error != null
                ? _buildError()
                : Column(
                    children: [
                      if (patient != null) _buildProfileHeader(patient),
                      Expanded(
                        child: TabBarView(
                          children: [
                            _SummaryTab(
                              patient: patient!,
                              assessments: _assessments,
                              sessions: _sessions,
                              homework: _homework,
                              carePlans: _carePlans,
                            ),
                            PatientTrendsTab(patientId: widget.patientId),
                            PatientReportTab(patientId: widget.patientId),
                            CarePlanScreen(patientId: widget.patientId),
                          ],
                        ),
                      ),
                    ],
                  ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => SessionNoteScreen(
                patientName: widget.patientName,
                patientId: widget.patientId,
              ),
            ),
          ),
          label: const Text('New Session'),
          icon: const Icon(Icons.mic),
          backgroundColor: const Color(0xFF8FB9A8),
        ),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(Map<String, dynamic> patient) {
    final risk = (patient['risk'] as String? ?? 'Low').toUpperCase();
    final status = patient['status'] as String? ?? 'Active';
    final diagnosis = patient['diagnosis'] as String? ?? 'Unspecified';
    final lastSeen = _formatDate(patient['last_seen'] as String?);
    final riskColor = switch (risk) {
      'HIGH' || 'CRISIS' => Colors.red,
      'MED' || 'MEDIUM' => Colors.orange,
      _ => Colors.green,
    };

    return Container(
      padding: const EdgeInsets.all(20),
      color: Colors.white,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: const Color(0xFF8FB9A8).withValues(alpha: 0.12),
            child: Text(
              widget.patientName.isEmpty ? '?' : widget.patientName[0],
              style: const TextStyle(
                fontSize: 24,
                color: Color(0xFF8FB9A8),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.patientName,
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  diagnosis,
                  style: const TextStyle(color: Colors.grey),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _DetailChip(label: status, color: Colors.blue),
                    _DetailChip(label: risk, color: riskColor),
                    _DetailChip(label: 'Last seen: $lastSeen', color: Colors.teal),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String? value) {
    if (value == null || value.isEmpty) return 'Unknown';
    try {
      final date = DateTime.parse(value).toLocal();
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return value;
    }
  }
}

class _SummaryTab extends StatelessWidget {
  final Map<String, dynamic> patient;
  final List<dynamic> assessments;
  final List<dynamic> sessions;
  final List<dynamic> homework;
  final List<dynamic> carePlans;

  const _SummaryTab({
    required this.patient,
    required this.assessments,
    required this.sessions,
    required this.homework,
    required this.carePlans,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _SummaryCard(
          title: 'Profile Summary',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SummaryRow('Diagnosis', patient['diagnosis'] as String? ?? 'Unspecified'),
              _SummaryRow('Risk', patient['risk'] as String? ?? 'Low'),
              _SummaryRow('Status', patient['status'] as String? ?? 'Active'),
              _SummaryRow(
                'Last seen',
                _formatDate(patient['last_seen'] as String?),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _HistorySection(
          title: 'Assessments History',
          items: assessments.take(5).map((item) {
            final map = item as Map<String, dynamic>;
            return _HistoryItem(
              title: map['assessment_id'] as String? ?? 'Assessment',
              subtitle:
                  '${map['severity'] ?? 'Scored'} • ${map['interpretation'] ?? ''}',
              trailing: (map['raw_score'] ?? '').toString(),
            );
          }).toList(),
          emptyText: 'No assessments recorded yet.',
        ),
        const SizedBox(height: 12),
        _HistorySection(
          title: 'Sessions History',
          items: sessions.take(5).map((item) {
            final map = item as Map<String, dynamic>;
            return _HistoryItem(
              title: map['template'] as String? ?? 'Session',
              subtitle: map['ai_draft_summary'] as String? ??
                  map['assessment'] as String? ??
                  'Session note recorded.',
              trailing: _formatDateTime(map['created_at'] as String?),
            );
          }).toList(),
          emptyText: 'No sessions recorded yet.',
        ),
        const SizedBox(height: 12),
        _HistorySection(
          title: 'Homework',
          items: homework.take(5).map((item) {
            final map = item as Map<String, dynamic>;
            return _HistoryItem(
              title: map['title'] as String? ?? 'Homework task',
              subtitle: map['instructions'] as String? ?? 'No instructions',
              trailing: map['status'] as String? ?? 'ASSIGNED',
            );
          }).toList(),
          emptyText: 'No homework assigned yet.',
        ),
        const SizedBox(height: 12),
        _HistorySection(
          title: 'Care Plans',
          items: carePlans.take(5).map((item) {
            final map = item as Map<String, dynamic>;
            final goals = map['goals'];
            final goalCount = goals is List ? goals.length : 0;
            return _HistoryItem(
              title: map['main_track'] as String? ?? 'Care plan',
              subtitle: '$goalCount goal${goalCount == 1 ? '' : 's'}',
              trailing: map['status'] as String? ?? 'DRAFT',
            );
          }).toList(),
          emptyText: 'No care plans created yet.',
        ),
      ],
    );
  }

  String _formatDate(String? value) {
    if (value == null || value.isEmpty) return 'Unknown';
    try {
      final date = DateTime.parse(value).toLocal();
      return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    } catch (_) {
      return value;
    }
  }

  String _formatDateTime(String? value) {
    if (value == null || value.isEmpty) return '';
    try {
      final date = DateTime.parse(value).toLocal();
      return '${date.month}/${date.day}';
    } catch (_) {
      return value;
    }
  }
}

class _HistorySection extends StatelessWidget {
  final String title;
  final List<_HistoryItem> items;
  final String emptyText;

  const _HistorySection({
    required this.title,
    required this.items,
    required this.emptyText,
  });

  @override
  Widget build(BuildContext context) {
    return _SummaryCard(
      title: title,
      child: items.isEmpty
          ? Text(emptyText, style: const TextStyle(color: Colors.grey))
          : Column(
              children: items
                  .map(
                    (item) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(item.title),
                      subtitle: Text(
                        item.subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Text(
                        item.trailing,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
    );
  }
}

class _HistoryItem {
  final String title;
  final String subtitle;
  final String trailing;

  const _HistoryItem({
    required this.title,
    required this.subtitle,
    required this.trailing,
  });
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SummaryCard({
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.grey,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  final String label;
  final Color color;

  const _DetailChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
