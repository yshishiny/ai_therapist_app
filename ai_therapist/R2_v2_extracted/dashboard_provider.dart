/// dashboard_provider.dart — Release 2
/// Replaces the hardcoded mock stats in R1 DashboardContent.
/// Provides real aggregated data via ChangeNotifier.

library;

import 'package:flutter/foundation.dart';
import '../homework/homework_service.dart';

// ─── Early warning model ──────────────────────────────────────────────────────

enum WarningLevel { info, attention, urgent }

class EarlyWarning {
  final String patientId;
  final String patientName;
  final String message;
  final WarningLevel level;
  final String category;   // 'risk' | 'trend' | 'adherence' | 'missed'

  const EarlyWarning({
    required this.patientId,
    required this.patientName,
    required this.message,
    required this.level,
    required this.category,
  });
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

class DashboardStats {
  final int activeCases;
  final int newThisMonth;
  final int riskAlerts;
  final int highPriority;
  final int assessmentsCompleted;
  final int assessmentsTrend;    // delta vs last month
  final int sessionsToday;
  final int sessionsRemaining;

  const DashboardStats({
    required this.activeCases,
    required this.newThisMonth,
    required this.riskAlerts,
    required this.highPriority,
    required this.assessmentsCompleted,
    required this.assessmentsTrend,
    required this.sessionsToday,
    required this.sessionsRemaining,
  });
}

// ─── Patient summary row (for dashboard list) ─────────────────────────────────

class PatientSummaryRow {
  final String id;
  final String name;
  final String status;
  final String risk;            // 'Low' | 'Med' | 'High' | 'Crisis'
  final String? lastAssessment; // e.g. 'PHQ-9: 14'
  final String lastSeen;
  final bool needsAttention;
  final String? attentionReason;

  const PatientSummaryRow({
    required this.id,
    required this.name,
    required this.status,
    required this.risk,
    this.lastAssessment,
    required this.lastSeen,
    required this.needsAttention,
    this.attentionReason,
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

class DashboardProvider extends ChangeNotifier {
  bool _isLoading = true;
  DashboardStats? _stats;
  List<EarlyWarning> _warnings = [];
  List<PatientSummaryRow> _patients = [];

  bool get isLoading => _isLoading;
  DashboardStats? get stats => _stats;
  List<EarlyWarning> get warnings => _warnings;
  List<PatientSummaryRow> get patients => _patients;

  List<EarlyWarning> get urgentWarnings =>
      _warnings.where((w) => w.level == WarningLevel.urgent).toList();

  List<PatientSummaryRow> get needsAttention =>
      _patients.where((p) => p.needsAttention).toList();

  /// Call on startup and after any data-mutating action.
  Future<void> refresh(String clinicianId) async {
    _isLoading = true;
    notifyListeners();

    // In production: replace with Firestore streams.
    // The structure is ready — swap _fetchPatients and _buildWarnings
    // with real queries scoped to clinicianId/orgId.

    await Future.delayed(const Duration(milliseconds: 600)); // simulate network

    _patients = await _fetchPatients(clinicianId);
    _warnings = _buildWarnings(_patients);
    _stats    = _buildStats(_patients, _warnings);

    _isLoading = false;
    notifyListeners();
  }

  // ─── Data fetching (replace bodies with Firestore) ────────────────────────

  Future<List<PatientSummaryRow>> _fetchPatients(String clinicianId) async {
    // TODO: Replace with:
    //   final snap = await FirebaseFirestore.instance
    //     .collection('patients')
    //     .where('assignedClinicianId', isEqualTo: clinicianId)
    //     .where('status', isEqualTo: 'active')
    //     .get();
    //   return snap.docs.map((d) => PatientSummaryRow.fromFirestore(d)).toList();

    // Enrich each patient with adherence data from local secure storage
    final mockPatients = _mockPatients();
    final enriched = <PatientSummaryRow>[];

    for (final p in mockPatients) {
      final adherence = await HomeworkService.getAdherenceSummary(p.id);
      final lowAdherence = adherence.totalAssigned > 0 &&
          adherence.completionRate < 0.5;

      enriched.add(PatientSummaryRow(
        id: p.id,
        name: p.name,
        status: p.status,
        risk: p.risk,
        lastAssessment: p.lastAssessment,
        lastSeen: p.lastSeen,
        needsAttention: p.needsAttention || lowAdherence,
        attentionReason: lowAdherence
            ? 'Low homework adherence (${(adherence.completionRate * 100).round()}%)'
            : p.attentionReason,
      ));
    }

    return enriched;
  }

  List<EarlyWarning> _buildWarnings(List<PatientSummaryRow> patients) {
    final warnings = <EarlyWarning>[];

    for (final p in patients) {
      // Risk-level based warnings
      if (p.risk == 'Crisis') {
        warnings.add(EarlyWarning(
          patientId: p.id, patientName: p.name,
          message: 'Crisis-level risk flag active — review safety plan',
          level: WarningLevel.urgent, category: 'risk',
        ));
      } else if (p.risk == 'High' && p.needsAttention) {
        warnings.add(EarlyWarning(
          patientId: p.id, patientName: p.name,
          message: p.attentionReason ?? 'Needs attention',
          level: WarningLevel.urgent, category: 'risk',
        ));
      }

      // Attention flags
      if (p.needsAttention && p.risk != 'High' && p.risk != 'Crisis') {
        warnings.add(EarlyWarning(
          patientId: p.id, patientName: p.name,
          message: p.attentionReason ?? 'Review recommended',
          level: WarningLevel.attention, category: 'trend',
        ));
      }
    }

    // Sort: urgent first
    warnings.sort((a, b) => b.level.index.compareTo(a.level.index));
    return warnings;
  }

  DashboardStats _buildStats(
    List<PatientSummaryRow> patients,
    List<EarlyWarning> warnings,
  ) {
    return DashboardStats(
      activeCases:           patients.where((p) => p.status == 'Active').length,
      newThisMonth:          2,    // TODO: filter by intakeDate >= start of month
      riskAlerts:            warnings.length,
      highPriority:          urgentWarnings.length,
      assessmentsCompleted:  14,   // TODO: aggregate from AssessmentService
      assessmentsTrend:      3,
      sessionsToday:         5,    // TODO: from SchedulingService
      sessionsRemaining:     2,
    );
  }

  // ─── Mock data (delete once Firestore is wired) ───────────────────────────

  static List<PatientSummaryRow> _mockPatients() => [
    const PatientSummaryRow(
      id: '1', name: 'Sarah Johnson', status: 'Active', risk: 'High',
      lastAssessment: 'PHQ-9: 17', lastSeen: '2 days ago',
      needsAttention: true, attentionReason: 'PHQ-9 worsened by 5 points',
    ),
    const PatientSummaryRow(
      id: '2', name: 'Ahmed Hassan', status: 'Active', risk: 'Low',
      lastAssessment: 'GAD-7: 8', lastSeen: '1 week ago',
      needsAttention: false,
    ),
    const PatientSummaryRow(
      id: '3', name: 'Laila Mahmoud', status: 'Active', risk: 'Med',
      lastAssessment: 'PHQ-9: 12', lastSeen: '3 days ago',
      needsAttention: true, attentionReason: 'Missed last session',
    ),
    const PatientSummaryRow(
      id: '4', name: 'Omar Khalil', status: 'Active', risk: 'Med',
      lastAssessment: 'ISI: 14', lastSeen: '5 days ago',
      needsAttention: false,
    ),
  ];
}
