/// dashboard_provider.dart — Release 3
/// Replaces mock data with real API calls to the Railway backend.

library;

import 'dart:convert';

import 'package:flutter/foundation.dart';
import '../careplan/homework_service.dart';
import '../../core/api_client.dart';

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
  final int assessmentsTrend;
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

  factory DashboardStats.fromApi(Map<String, dynamic> json) {
    return DashboardStats(
      activeCases:          json['active_cases']           as int? ?? 0,
      newThisMonth:         json['new_this_month']         as int? ?? 0,
      riskAlerts:           json['risk_alerts']            as int? ?? 0,
      highPriority:         json['high_priority']          as int? ?? 0,
      assessmentsCompleted: json['assessments_completed']  as int? ?? 0,
      assessmentsTrend:     json['assessments_trend']      as int? ?? 0,
      sessionsToday:        json['sessions_today']         as int? ?? 0,
      sessionsRemaining:    json['sessions_remaining']     as int? ?? 0,
    );
  }

  /// Fallback when /dashboard/summary is not yet available
  factory DashboardStats.fromPatients(
    List<PatientSummaryRow> patients,
    List<EarlyWarning> warnings,
    int highPriority,
  ) {
    return DashboardStats(
      activeCases:          patients.where((p) => p.status == 'Active').length,
      newThisMonth:         0,
      riskAlerts:           warnings.length,
      highPriority:         highPriority,
      assessmentsCompleted: 0,
      assessmentsTrend:     0,
      sessionsToday:        0,
      sessionsRemaining:    0,
    );
  }
}

// ─── Patient summary row (for dashboard list) ─────────────────────────────────

class PatientSummaryRow {
  final String id;
  final String name;
  final String status;
  final String risk;
  final String? lastAssessment;
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

  factory PatientSummaryRow.fromApi(Map<String, dynamic> json) {
    final riskRaw = (json['risk'] as String? ?? 'Low');
    final risk = _normaliseRisk(riskRaw);
    final isHighRisk = risk == 'High' || risk == 'Crisis';
    final lastSeen = _formatDate(json['last_seen'] as String?);
    return PatientSummaryRow(
      id:             json['id'] as String,
      name:           json['name'] as String,
      status:         json['status'] as String? ?? 'Active',
      risk:           risk,
      lastAssessment: null,   // enriched later by assessment fetch
      lastSeen:       lastSeen,
      needsAttention: isHighRisk,
      attentionReason: isHighRisk ? 'High-risk flag active' : null,
    );
  }

  static String _normaliseRisk(String raw) {
    switch (raw.toLowerCase()) {
      case 'high':   return 'High';
      case 'medium':
      case 'med':    return 'Med';
      case 'crisis': return 'Crisis';
      default:       return 'Low';
    }
  }

  static String _formatDate(String? iso) {
    if (iso == null) return 'Unknown';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inDays == 0) return 'Today';
      if (diff.inDays == 1) return 'Yesterday';
      if (diff.inDays < 7)  return '${diff.inDays} days ago';
      return '${(diff.inDays / 7).round()} week(s) ago';
    } catch (_) {
      return 'Unknown';
    }
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

class DashboardProvider extends ChangeNotifier {
  bool _isLoading = true;
  String? _error;
  DashboardStats? _stats;
  List<EarlyWarning> _warnings = [];
  List<PatientSummaryRow> _patients = [];

  bool get isLoading => _isLoading;
  String? get error  => _error;
  DashboardStats? get stats => _stats;
  List<EarlyWarning> get warnings => _warnings;
  List<PatientSummaryRow> get patients => _patients;

  List<EarlyWarning> get urgentWarnings =>
      _warnings.where((w) => w.level == WarningLevel.urgent).toList();

  List<PatientSummaryRow> get needsAttention =>
      _patients.where((p) => p.needsAttention).toList();

  /// Fetch real data from the backend. Call on login and after mutations.
  Future<void> refresh(String clinicianId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // 1. Fetch patient list from real API
      final patientsResp = await ApiClient.instance.get('/patients');
      if (patientsResp.statusCode == 200) {
        // GET /patients returns {items, total, limit, offset}; listItems()
        // also accepts the bare array older backends return.
        final raw = listItems(jsonDecode(patientsResp.body));
        final apiPatients = raw
            .map((e) => PatientSummaryRow.fromApi(e as Map<String, dynamic>))
            .toList();

        // 2. Enrich with homework adherence from local secure storage
        final enriched = <PatientSummaryRow>[];
        for (final p in apiPatients) {
          final adherence = await HomeworkService.getAdherenceSummary(p.id);
          final lowAdherence = adherence.totalAssigned > 0 &&
              adherence.completionRate < 0.5;
          enriched.add(PatientSummaryRow(
            id:             p.id,
            name:           p.name,
            status:         p.status,
            risk:           p.risk,
            lastAssessment: p.lastAssessment,
            lastSeen:       p.lastSeen,
            needsAttention: p.needsAttention || lowAdherence,
            attentionReason: lowAdherence
                ? 'Low adherence (${(adherence.completionRate * 100).round()}%)'
                : p.attentionReason,
          ));
        }
        _patients = enriched;
      }

      // 3. Build warnings from patient risk data
      _warnings = _buildWarnings(_patients);

      // 4. Fetch dashboard summary stats
      try {
        final summaryResp =
            await ApiClient.instance.get('/dashboard/summary');
        if (summaryResp.statusCode == 200) {
          _stats = DashboardStats.fromApi(
              jsonDecode(summaryResp.body) as Map<String, dynamic>);
        } else {
          _stats = DashboardStats.fromPatients(
              _patients, _warnings, urgentWarnings.length);
        }
      } catch (_) {
        // /dashboard/summary not yet deployed — derive from patient list
        _stats = DashboardStats.fromPatients(
            _patients, _warnings, urgentWarnings.length);
      }
    } on ApiException catch (e) {
      _error = e.message;
      debugPrint('DashboardProvider error: $e');
    } catch (e) {
      _error = 'Failed to load dashboard data.';
      debugPrint('DashboardProvider unexpected error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  List<EarlyWarning> _buildWarnings(List<PatientSummaryRow> patients) {
    final warnings = <EarlyWarning>[];
    for (final p in patients) {
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
      } else if (p.needsAttention) {
        warnings.add(EarlyWarning(
          patientId: p.id, patientName: p.name,
          message: p.attentionReason ?? 'Review recommended',
          level: WarningLevel.attention, category: 'trend',
        ));
      }
    }
    warnings.sort((a, b) => b.level.index.compareTo(a.level.index));
    return warnings;
  }
}
