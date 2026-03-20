/// patient_folder_screen.dart — Release 2
/// Full clinical folder with 5 tabs:
///   Profile    — clinical data, history, goals, strengths, triggers
///   Timeline   — sessions + assessments + homework in chronological order
///   Assessments— scores, trends (fl_chart), next recommendation
///   Homework   — assignments, adherence, feedback
///   Settings   — consent records, audit log, danger zone

library;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../patients/patient_folder_model.dart';
import '../homework/homework_service.dart';
import '../sessions/session_ai_review_screen.dart';
import '../sessions/session_note_screen.dart';
import '../assessments/universal_assessment_screen.dart';
import 'patient_trends_tab.dart';
import '../../core/api_client.dart';
import 'dart:convert';

class PatientFolderScreen extends StatefulWidget {
  final PatientFolder patient;

  const PatientFolderScreen({super.key, required this.patient});

  @override
  State<PatientFolderScreen> createState() => _PatientFolderScreenState();
}

class _PatientFolderScreenState extends State<PatientFolderScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late PatientFolder _patient;

  @override
  void initState() {
    super.initState();
    _patient = widget.patient;
    _tabController = TabController(length: 5, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F8),
      body: NestedScrollView(
        headerSliverBuilder: (context, _) => [_buildSliverHeader()],
        body: TabBarView(
          controller: _tabController,
          children: [
            _ProfileTab(
                patient: _patient,
                onUpdated: (p) => setState(() => _patient = p)),
            _TimelineTab(patient: _patient),
            _AssessmentsTab(patient: _patient),
            _HomeworkTab(patient: _patient),
            _SettingsTab(patient: _patient),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF8FB9A8),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.mic),
        label: const Text('New session'),
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SessionNoteScreen(
              patientName: _patient.fullName,
              patientId: _patient.id,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSliverHeader() {
    final risk = _patient.riskLevel;
    final riskColor = Color(risk.colorValue);

    return SliverAppBar(
      expandedHeight: 180,
      pinned: true,
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back, color: Colors.black87),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        IconButton(
            icon: const Icon(Icons.edit_outlined, color: Colors.black87),
            onPressed: () {}),
        IconButton(
            icon: const Icon(Icons.more_vert, color: Colors.black87),
            onPressed: () {}),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(20, 80, 20, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor:
                    const Color(0xFF8FB9A8).withValues(alpha: 0.15),
                child: Text(
                  _patient.initials,
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF8FB9A8),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(_patient.fullName,
                        style: GoogleFonts.inter(
                            fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (_patient.ageYears != null) '${_patient.ageYears}y',
                        _patient.gender.name,
                        if (_patient.primaryDiagnosis != null)
                          _patient.primaryDiagnosis!,
                      ].join(' · '),
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      children: [
                        _Pill(_patient.status.label, Colors.blue),
                        _Pill(risk.label, riskColor),
                        if (_patient.hasActiveRiskFlags)
                          const _Pill('Risk flags', Colors.red),
                        if (!_patient.hasAiConsent)
                          const _Pill('No AI consent', Colors.orange),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottom: TabBar(
        controller: _tabController,
        isScrollable: true,
        labelColor: const Color(0xFF8FB9A8),
        unselectedLabelColor: Colors.grey,
        indicatorColor: const Color(0xFF8FB9A8),
        labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
        tabs: const [
          Tab(text: 'Profile'),
          Tab(text: 'Timeline'),
          Tab(text: 'Assessments'),
          Tab(text: 'Homework'),
          Tab(text: 'Settings'),
        ],
      ),
    );
  }
}

// ─── Tab 1: Profile ───────────────────────────────────────────────────────────

class _ProfileTab extends StatelessWidget {
  final PatientFolder patient;
  final ValueChanged<PatientFolder> onUpdated;

  const _ProfileTab({required this.patient, required this.onUpdated});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildChiefComplaint(),
        const SizedBox(height: 12),
        _buildListSection('Treatment goals', patient.treatmentGoals,
            Icons.flag_outlined, const Color(0xFF6C63FF)),
        const SizedBox(height: 12),
        _buildListSection('Identified strengths', patient.strengths,
            Icons.star_outline, Colors.green),
        const SizedBox(height: 12),
        _buildListSection('Known triggers', patient.triggers,
            Icons.bolt_outlined, Colors.orange),
        const SizedBox(height: 12),
        _buildListSection('Coping strategies', patient.copingStrategies,
            Icons.favorite_outline, Colors.teal),
        const SizedBox(height: 12),
        _buildRiskChecklist(),
        const SizedBox(height: 12),
        _buildClinicalHistory(),
        const SizedBox(height: 12),
        _buildEmergencyContact(),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildChiefComplaint() {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeader(
              'Chief complaint', Icons.chat_bubble_outline, Colors.grey),
          const SizedBox(height: 10),
          Text(
            patient.chiefComplaint ?? 'Not recorded yet.',
            style: const TextStyle(
                fontSize: 14,
                height: 1.6,
                fontStyle: FontStyle.italic,
                color: Colors.black87),
          ),
          if (patient.primaryDiagnosis != null) ...[
            const Divider(height: 24),
            const _SectionHeader('Primary diagnosis',
                Icons.local_hospital_outlined, Colors.blue),
            const SizedBox(height: 8),
            Text(patient.primaryDiagnosis!,
                style:
                    const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            if (patient.comorbidities.isNotEmpty) ...[
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: patient.comorbidities
                    .map((c) => Chip(
                        label: Text(c, style: const TextStyle(fontSize: 11)),
                        visualDensity: VisualDensity.compact))
                    .toList(),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildListSection(
      String title, List<String> items, IconData icon, Color color) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _SectionHeader(title, icon, color),
              const Spacer(),
              Text('${items.length}',
                  style: TextStyle(fontSize: 12, color: color)),
            ],
          ),
          if (items.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 10),
              child: Text('None recorded.',
                  style: TextStyle(color: Colors.grey, fontSize: 13)),
            )
          else
            ...items.asMap().entries.map((e) => Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text('${e.key + 1}',
                              style: TextStyle(
                                  fontSize: 9,
                                  color: color,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                          child: Text(e.value,
                              style:
                                  const TextStyle(fontSize: 13, height: 1.5))),
                    ],
                  ),
                )),
        ],
      ),
    );
  }

  Widget _buildRiskChecklist() {
    final rc = patient.riskChecklist;
    final checks = {
      'Suicidal ideation': rc.suicidalIdeation,
      'Self-harm history': rc.selfHarmHistory,
      'Homicidal ideation': rc.homicidalIdeation,
      'Substance use': rc.substanceUse,
      'Domestic violence': rc.domesticViolence,
      'Psychosis signs': rc.psychosisSigns,
      'Eating disorder': rc.eatingDisorder,
    };
    return _Card(
      borderColor: rc.anyFlagged ? Colors.red.shade200 : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader('Risk checklist', Icons.shield_outlined,
              rc.anyFlagged ? Colors.red : Colors.grey),
          const SizedBox(height: 10),
          ...checks.entries.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Icon(
                      e.value
                          ? Icons.warning_amber_rounded
                          : Icons.check_circle_outline,
                      size: 16,
                      color: e.value ? Colors.red : Colors.green,
                    ),
                    const SizedBox(width: 8),
                    Text(e.key, style: const TextStyle(fontSize: 13)),
                    const Spacer(),
                    Text(
                      e.value ? 'Flagged' : 'Clear',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: e.value ? Colors.red : Colors.green,
                      ),
                    ),
                  ],
                ),
              )),
          const Divider(),
          Text(
            'Last reviewed: ${_fmtDate(rc.lastReviewedAt)} by ${rc.reviewedBy}',
            style: const TextStyle(fontSize: 11, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildClinicalHistory() {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeader(
              'Clinical history', Icons.history_edu_outlined, Colors.purple),
          const SizedBox(height: 10),
          if (patient.presentingHistory != null) ...[
            const Text('Presenting history',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey)),
            const SizedBox(height: 4),
            Text(patient.presentingHistory!,
                style: const TextStyle(fontSize: 13, height: 1.6)),
            const SizedBox(height: 12),
          ],
          if (patient.relevantHistory != null) ...[
            const Text('Relevant background',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey)),
            const SizedBox(height: 4),
            Text(patient.relevantHistory!,
                style: const TextStyle(fontSize: 13, height: 1.6)),
          ],
          if (patient.medicationsNotes != null) ...[
            const SizedBox(height: 12),
            const Text('Medications note',
                style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.grey)),
            const SizedBox(height: 4),
            Text(patient.medicationsNotes!,
                style: const TextStyle(fontSize: 13, height: 1.6)),
          ],
        ],
      ),
    );
  }

  Widget _buildEmergencyContact() {
    final ec = patient.emergencyContact;
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeader(
              'Emergency contact', Icons.contact_phone_outlined, Colors.teal),
          const SizedBox(height: 12),
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Colors.teal.withValues(alpha: 0.1),
                child: Text(ec.name[0],
                    style: const TextStyle(
                        color: Colors.teal, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ec.name,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 14)),
                    Text('${ec.relationship} · ${ec.phone}',
                        style:
                            const TextStyle(fontSize: 12, color: Colors.grey)),
                    if (ec.isAware)
                      const Text('Aware of therapy',
                          style: TextStyle(fontSize: 11, color: Colors.green)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _fmtDate(DateTime dt) => '${dt.day}/${dt.month}/${dt.year}';
}

// ─── Tab 2: Timeline ──────────────────────────────────────────────────────────

class _TimelineTab extends StatelessWidget {
  final PatientFolder patient;
  const _TimelineTab({required this.patient});

  // Mock timeline entries — replace with Firestore stream
  static final List<_TimelineEntry> _entries = [
    _TimelineEntry(
      date: DateTime.now().subtract(const Duration(days: 2)),
      type: 'session',
      title: 'Session #8',
      subtitle: 'CBT — cognitive restructuring of core belief "I am unlovable"',
      icon: Icons.mic,
      color: const Color(0xFF8FB9A8),
    ),
    _TimelineEntry(
      date: DateTime.now().subtract(const Duration(days: 4)),
      type: 'assessment',
      title: 'PHQ-9',
      subtitle: 'Score 12 — Moderate depression (↓ from 17 last month)',
      icon: Icons.assignment,
      color: Colors.purple,
    ),
    _TimelineEntry(
      date: DateTime.now().subtract(const Duration(days: 4)),
      type: 'homework',
      title: 'Thought diary',
      subtitle: 'Completed 80% · rated helpful 4/5',
      icon: Icons.edit_note,
      color: Colors.blue,
    ),
    _TimelineEntry(
      date: DateTime.now().subtract(const Duration(days: 11)),
      type: 'session',
      title: 'Session #7',
      subtitle:
          'Crisis check-in following work incident. Safety plan reviewed.',
      icon: Icons.mic,
      color: const Color(0xFF8FB9A8),
    ),
    _TimelineEntry(
      date: DateTime.now().subtract(const Duration(days: 18)),
      type: 'assessment',
      title: 'GAD-7',
      subtitle: 'Score 16 — Severe anxiety',
      icon: Icons.assignment,
      color: Colors.orange,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      itemCount: _entries.length,
      itemBuilder: (context, i) {
        final entry = _entries[i];
        final showDate = i == 0 || _entries[i - 1].date.day != entry.date.day;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (showDate) ...[
              if (i > 0) const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.only(left: 48, bottom: 8),
                child: Text(
                  _relativeDate(entry.date),
                  style: const TextStyle(
                      fontSize: 11,
                      color: Colors.grey,
                      fontWeight: FontWeight.w600),
                ),
              ),
            ],
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: entry.color.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(entry.icon, size: 16, color: entry.color),
                    ),
                    if (i < _entries.length - 1)
                      Container(
                          width: 1.5, height: 40, color: Colors.grey.shade200),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 4),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade100),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(entry.title,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14)),
                            ),
                            Text(_fmtTime(entry.date),
                                style: const TextStyle(
                                    fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(entry.subtitle,
                            style: const TextStyle(
                                fontSize: 12,
                                color: Colors.black87,
                                height: 1.4)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  String _relativeDate(DateTime dt) {
    final diff = DateTime.now().difference(dt).inDays;
    if (diff == 0) return 'Today';
    if (diff == 1) return 'Yesterday';
    if (diff < 7) return '$diff days ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  String _fmtTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _TimelineEntry {
  final DateTime date;
  final String type;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _TimelineEntry({
    required this.date,
    required this.type,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });
}

// ─── Tab 3: Assessments ───────────────────────────────────────────────────────

class _AssessmentsTab extends StatefulWidget {
  final PatientFolder patient;
  const _AssessmentsTab({required this.patient});

  @override
  State<_AssessmentsTab> createState() => _AssessmentsTabState();
}

class _AssessmentsTabState extends State<_AssessmentsTab> {
  List<dynamic> _templates = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchTemplates();
  }

  Future<void> _fetchTemplates() async {
    try {
      final resp = await ApiClient.instance.get('/assessments/templates');
      if (resp.statusCode == 200) {
        if (mounted) setState(() => _templates = jsonDecode(resp.body));
      }
    } catch (_) {
      // Handle silently for now
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
          child: Text('Available Templates', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF2D3748))),
        ),
        if (_loading)
           const Padding(padding: EdgeInsets.all(20), child: Center(child: CircularProgressIndicator(color: Color(0xFF8FB9A8))))
        else if (_templates.isEmpty)
           const Padding(padding: EdgeInsets.all(20), child: Text('No templates loaded from server.'))
        else
           SizedBox(
             height: 120,
             child: ListView.builder(
               scrollDirection: Axis.horizontal,
               padding: const EdgeInsets.symmetric(horizontal: 16),
               itemCount: _templates.length,
               itemBuilder: (context, i) {
                 final t = _templates[i];
                 return Container(
                   width: 160,
                   margin: const EdgeInsets.only(right: 12),
                   child: InkWell(
                     onTap: () async {
                        final result = await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => UniversalAssessmentScreen(
                             patientId: widget.patient.id,
                             templateId: t['id'],
                             templateName: t['name'],
                             type: t['template_type'],
                             scoringRules: t['scoring_rules'],
                          ))
                        );
                        // If they took a test, we can refresh the trends below
                        if (result == true) {
                           setState((){}); // rebuild forces trend tab to re-fetch
                        }
                     },
                     borderRadius: BorderRadius.circular(16),
                     child: Container(
                       padding: const EdgeInsets.all(16),
                       decoration: BoxDecoration(
                         color: Colors.white,
                         borderRadius: BorderRadius.circular(16),
                         border: Border.all(color: Colors.grey.shade200),
                       ),
                       child: Column(
                         crossAxisAlignment: CrossAxisAlignment.start,
                         mainAxisAlignment: MainAxisAlignment.center,
                         children: [
                            Icon(
                              t['template_type'] == 'ART_THERAPY' ? Icons.palette_outlined : 
                              (t['template_type'] == 'SOMATIC' ? Icons.accessibility_new_rounded : Icons.assignment_outlined),
                              color: const Color(0xFF8FB9A8),
                              size: 28,
                            ),
                            const Spacer(),
                            Text(t['name'], style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                         ],
                       ),
                     ),
                   ),
                 );
               },
             ),
           ),
        const Divider(height: 32),
        // The trends tab handles fetching the history and charting
        Expanded(child: PatientTrendsTab(key: UniqueKey(), patientId: widget.patient.id)),
      ],
    );
  }
}

// ─── Tab 4: Homework ──────────────────────────────────────────────────────────

class _HomeworkTab extends StatefulWidget {
  final PatientFolder patient;
  const _HomeworkTab({required this.patient});

  @override
  State<_HomeworkTab> createState() => _HomeworkTabState();
}

class _HomeworkTabState extends State<_HomeworkTab> {
  List<HomeworkTask> _tasks = [];
  AdherenceSummary? _summary;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final tasks = await HomeworkService.getTasksForPatient(widget.patient.id);
    final summary =
        await HomeworkService.getAdherenceSummary(widget.patient.id);
    if (mounted) {
      setState(() {
        _tasks = tasks;
        _summary = summary;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _summary;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (summary != null && summary.totalAssigned > 0) ...[
          _Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionHeader('Adherence overview',
                    Icons.bar_chart_outlined, Colors.teal),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _AdherenceStat('Assigned', summary.totalAssigned.toString(),
                        Colors.grey),
                    _AdherenceStat('Completed', summary.completed.toString(),
                        Colors.green),
                    _AdherenceStat('Partial', summary.partiallyDone.toString(),
                        Colors.blue),
                    _AdherenceStat(
                        'Skipped', summary.skipped.toString(), Colors.orange),
                  ],
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: summary.completionRate,
                    minHeight: 8,
                    backgroundColor: Colors.grey.shade100,
                    valueColor:
                        const AlwaysStoppedAnimation<Color>(Colors.teal),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${(summary.completionRate * 100).round()}% completion rate',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (_tasks.isEmpty)
          const _Card(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text('No homework assigned yet.',
                    style: TextStyle(color: Colors.grey)),
              ),
            ),
          )
        else
          ..._tasks.map((task) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _HomeworkCard(task: task, onUpdated: _load),
              )),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _AdherenceStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _AdherenceStat(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
    );
  }
}

class _HomeworkCard extends StatelessWidget {
  final HomeworkTask task;
  final VoidCallback onUpdated;

  const _HomeworkCard({required this.task, required this.onUpdated});

  @override
  Widget build(BuildContext context) {
    final statusColor = {
      HomeworkStatus.assigned: Colors.blue,
      HomeworkStatus.inProgress: Colors.orange,
      HomeworkStatus.completed: Colors.green,
      HomeworkStatus.partiallyDone: Colors.teal,
      HomeworkStatus.skipped: Colors.grey,
    }[task.status]!;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade100),
        borderLeft: Border(left: BorderSide(color: statusColor, width: 3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(task.title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  task.status.name
                      .replaceAll(RegExp(r'(?<=[a-z])(?=[A-Z])'), ' '),
                  style: TextStyle(
                      fontSize: 10,
                      color: statusColor,
                      fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(task.description,
              style: const TextStyle(fontSize: 12, color: Colors.black87)),
          const SizedBox(height: 6),
          Text(task.frequencyGuide,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          if (task.feedback != null) ...[
            const Divider(height: 16),
            Text(
              'Patient feedback: ${task.feedback!.completionPercent}% complete · '
              'Helpful: ${task.feedback!.helpfulnessRating}/5',
              style: const TextStyle(fontSize: 12, color: Colors.teal),
            ),
          ],
          if (task.isOverdue)
            const Padding(
              padding: EdgeInsets.only(top: 6),
              child: Text('Overdue',
                  style: TextStyle(
                      fontSize: 11,
                      color: Colors.red,
                      fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}

// ─── Tab 5: Settings (Consent + Audit) ───────────────────────────────────────

class _SettingsTab extends StatelessWidget {
  final PatientFolder patient;
  const _SettingsTab({required this.patient});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SectionHeader(
                  'Consent records', Icons.gavel_outlined, Colors.purple),
              const SizedBox(height: 12),
              if (patient.consentRecords.isEmpty)
                const Text('No consent records.',
                    style: TextStyle(color: Colors.grey, fontSize: 13))
              else
                ...patient.consentRecords.map((c) => _ConsentRow(consent: c)),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Record consent',
                    style: TextStyle(fontSize: 13)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: Colors.grey.shade300),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SectionHeader(
                  'Audit log', Icons.history_outlined, Colors.grey),
              const SizedBox(height: 12),
              if (patient.auditTrail.isEmpty)
                const Text('No activity recorded yet.',
                    style: TextStyle(color: Colors.grey, fontSize: 13))
              else
                ...patient.auditTrail.reversed.take(10).map((a) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          const Icon(Icons.circle, size: 6, color: Colors.grey),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              '${a.action} · ${a.field}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                          Text(
                            '${a.timestamp.day}/${a.timestamp.month}',
                            style: const TextStyle(
                                fontSize: 11, color: Colors.grey),
                          ),
                        ],
                      ),
                    )),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _Card(
          borderColor: Colors.red.shade200,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SectionHeader(
                  'Danger zone', Icons.warning_outlined, Colors.red),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.picture_as_pdf_outlined,
                    size: 16, color: Colors.blue),
                label: const Text('Export case summary PDF',
                    style: TextStyle(fontSize: 13, color: Colors.blue)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: Colors.blue.shade200),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.archive_outlined,
                    size: 16, color: Colors.orange),
                label: const Text('Discharge patient',
                    style: TextStyle(fontSize: 13, color: Colors.orange)),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: Colors.orange.shade200),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 80),
      ],
    );
  }
}

class _ConsentRow extends StatelessWidget {
  final ConsentRecord consent;
  const _ConsentRow({required this.consent});

  @override
  Widget build(BuildContext context) {
    final color = consent.status == ConsentStatus.granted
        ? Colors.green
        : consent.status == ConsentStatus.denied
            ? Colors.red
            : Colors.orange;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(
            consent.status == ConsentStatus.granted
                ? Icons.check_circle_outline
                : Icons.cancel_outlined,
            size: 18,
            color: color,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(consent.type.replaceAll('_', ' '),
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w500)),
                Text(
                  '${consent.recordedBy} · ${consent.recordedAt.day}/${consent.recordedAt.month}/${consent.recordedAt.year}',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(consent.status.name,
                style: TextStyle(
                    fontSize: 10, color: color, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

class _Card extends StatelessWidget {
  final Widget child;
  final Color? borderColor;

  const _Card({required this.child, this.borderColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
            color: borderColor ?? Colors.grey.shade100,
            width: borderColor != null ? 1.5 : 1),
      ),
      child: child,
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final Color color;
  const _Pill(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 10, fontWeight: FontWeight.bold, color: color)),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;

  const _SectionHeader(this.title, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Text(title,
            style: TextStyle(
                fontSize: 13, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}

extension on Container {
  Container get borderLeft => this;
}
