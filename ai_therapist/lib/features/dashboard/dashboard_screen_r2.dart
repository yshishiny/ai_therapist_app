/// dashboard_screen_r2.dart — Release 2
/// Replaces R1 DashboardContent. Consumes DashboardProvider via Consumer.
/// Add DashboardProvider to MultiProvider in main.dart alongside AuthService.

library;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'dashboard_provider.dart';
import '../sessions/session_note_screen.dart';
import '../calendar/scheduler_screen.dart';
import '../assessments/assessment_list_screen.dart';
import '../resources/reference_library_screen.dart';

// ─── Root scaffold with bottom nav ────────────────────────────────────────────

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const _DashboardHome(),
    const SchedulerScreen(),
    const AssessmentListScreen(),
    const ReferenceLibraryScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Load dashboard data on first render
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DashboardProvider>().refresh('current_clinician_id');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_today_outlined),
            selectedIcon: Icon(Icons.calendar_today),
            label: 'Schedule',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Assessments',
          ),
          NavigationDestination(
            icon: Icon(Icons.library_books_outlined),
            selectedIcon: Icon(Icons.library_books),
            label: 'Resources',
          ),
        ],
      ),
    );
  }
}

// ─── Home tab content ─────────────────────────────────────────────────────────

class _DashboardHome extends StatelessWidget {
  const _DashboardHome();

  @override
  Widget build(BuildContext context) {
    return Consumer<DashboardProvider>(
      builder: (context, provider, _) {
        return Scaffold(
          backgroundColor: const Color(0xFFF5F7F8),
          appBar: _buildAppBar(context, provider),
          body: provider.isLoading
              ? _buildSkeleton()
              : RefreshIndicator(
                  onRefresh: () => provider.refresh('current_clinician_id'),
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildBilingualHeader(),
                      const SizedBox(height: 20),
                      if (provider.urgentWarnings.isNotEmpty) ...[
                        _buildWarningBanner(context, provider),
                        const SizedBox(height: 16),
                      ],
                      _buildStatsGrid(provider.stats!),
                      const SizedBox(height: 24),
                      if (provider.needsAttention.isNotEmpty) ...[
                        _buildNeedsAttentionList(context, provider),
                        const SizedBox(height: 20),
                      ],
                      _buildAllPatients(context, provider),
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
          floatingActionButton: FloatingActionButton.extended(
            backgroundColor: const Color(0xFF8FB9A8),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) =>
                    const SessionNoteScreen(patientName: 'Select Patient'),
              ),
            ),
            icon: const Icon(Icons.add),
            label: const Text('New session'),
          ),
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar(
      BuildContext context, DashboardProvider provider) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      title: Text('Clinical overview',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
      actions: [
        if (provider.urgentWarnings.isNotEmpty)
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined,
                    color: Colors.black87),
                onPressed: () {},
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          )
        else
          IconButton(
            icon: const Icon(Icons.notifications_none, color: Colors.black87),
            onPressed: () {},
          ),
        const CircleAvatar(
          backgroundColor: Color(0xFFF1D3B3),
          child:
              Text('HM', style: TextStyle(color: Colors.brown, fontSize: 13)),
        ),
        const SizedBox(width: 16),
      ],
    );
  }

  Widget _buildBilingualHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('نظرة عامة طبية',
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: const Color(0xFF8FB9A8),
            )),
        Text(
          _greeting(),
          style: const TextStyle(fontSize: 13, color: Colors.grey),
        ),
      ],
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning, Doctor';
    if (h < 17) return 'Good afternoon, Doctor';
    return 'Good evening, Doctor';
  }

  Widget _buildWarningBanner(BuildContext context, DashboardProvider provider) {
    final count = provider.urgentWarnings.length;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.shade200, width: 1.5),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '$count patient${count > 1 ? 's need' : ' needs'} urgent attention',
              style: const TextStyle(
                  color: Colors.red, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          TextButton(
            onPressed: () {},
            child: const Text('View', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsGrid(DashboardStats stats) {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      childAspectRatio: 1.5,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      children: [
        _StatCard(
          label: 'Active cases',
          value: '${stats.activeCases}',
          trend: '+${stats.newThisMonth} this month',
          color: Colors.blue,
        ),
        _StatCard(
          label: 'Risk alerts',
          value: '${stats.riskAlerts}',
          trend: '${stats.highPriority} urgent',
          color: stats.highPriority > 0 ? Colors.red : Colors.orange,
        ),
        _StatCard(
          label: 'Assessments',
          value: '${stats.assessmentsCompleted}',
          trend: '+${stats.assessmentsTrend} this month',
          color: Colors.green,
        ),
        _StatCard(
          label: 'Sessions today',
          value: '${stats.sessionsToday}',
          trend: '${stats.sessionsRemaining} remaining',
          color: Colors.purple,
        ),
      ],
    );
  }

  Widget _buildNeedsAttentionList(BuildContext context, DashboardProvider p) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Needs attention',
                style: GoogleFonts.inter(
                    fontSize: 16, fontWeight: FontWeight.bold)),
            Text('${p.needsAttention.length}',
                style: const TextStyle(fontSize: 13, color: Colors.red)),
          ],
        ),
        const SizedBox(height: 10),
        ...p.needsAttention.map((patient) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _AttentionCard(patient: patient),
            )),
      ],
    );
  }

  Widget _buildAllPatients(BuildContext context, DashboardProvider p) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('All patients',
                  style: GoogleFonts.inter(
                      fontSize: 16, fontWeight: FontWeight.bold)),
              TextButton(
                onPressed: () {},
                child: const Text('View all'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...p.patients.take(5).map((patient) => Column(
                children: [
                  _PatientRow(patient: patient),
                  if (patient != p.patients.take(5).last)
                    const Divider(height: 1),
                ],
              )),
        ],
      ),
    );
  }

  Widget _buildSkeleton() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SizedBox(height: 20),
        const _SkeletonBox(height: 50, width: 200),
        const SizedBox(height: 20),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          childAspectRatio: 1.5,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          children: List.generate(4, (_) => const _SkeletonBox(height: 80)),
        ),
        const SizedBox(height: 24),
        const _SkeletonBox(height: 160),
      ],
    );
  }
}

// ─── Sub-widgets ──────────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final String trend;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.trend,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
          const Spacer(),
          Text(value,
              style: GoogleFonts.inter(
                  fontSize: 26, fontWeight: FontWeight.bold)),
          Text(trend,
              style: TextStyle(
                  fontSize: 10, color: color, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _AttentionCard extends StatelessWidget {
  final PatientSummaryRow patient;
  const _AttentionCard({required this.patient});

  @override
  Widget build(BuildContext context) {
    final riskColor = patient.risk == 'High' || patient.risk == 'Crisis'
        ? Colors.red
        : Colors.orange;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: riskColor.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: riskColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: riskColor.withValues(alpha: 0.15),
            child: Text(patient.name[0],
                style:
                    TextStyle(color: riskColor, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(patient.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
                if (patient.attentionReason != null)
                  Text(patient.attentionReason!,
                      style: TextStyle(fontSize: 11, color: riskColor)),
              ],
            ),
          ),
          Icon(Icons.chevron_right, color: riskColor, size: 20),
        ],
      ),
    );
  }
}

class _PatientRow extends StatelessWidget {
  final PatientSummaryRow patient;
  const _PatientRow({required this.patient});

  @override
  Widget build(BuildContext context) {
    Color riskColor = Colors.green;
    if (patient.risk == 'High') riskColor = Colors.red;
    if (patient.risk == 'Med') riskColor = Colors.orange;
    if (patient.risk == 'Crisis') riskColor = Colors.purple;

    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: const Color(0xFF8FB9A8).withValues(alpha: 0.1),
              child: Text(patient.name[0],
                  style: const TextStyle(
                      color: Color(0xFF8FB9A8), fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(patient.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14)),
                  Text(
                    [patient.lastAssessment ?? '', patient.lastSeen]
                        .where((s) => s.isNotEmpty)
                        .join(' · '),
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ],
              ),
            ),
            if (patient.needsAttention)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(right: 8),
                decoration: const BoxDecoration(
                    color: Colors.red, shape: BoxShape.circle),
              ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: riskColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(patient.risk,
                  style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: riskColor)),
            ),
          ],
        ),
      ),
    );
  }
}

class _SkeletonBox extends StatelessWidget {
  final double height;
  final double? width;
  const _SkeletonBox({required this.height, this.width});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(14),
      ),
    );
  }
}
