import 'package:flutter/foundation.dart';

import '../../core/api_client.dart';
import '../../core/secure_phi_storage.dart';

class AssessmentResult {
  final String assessmentId;
  final int rawScore;
  final String interpretation;
  final String severity;
  final DateTime timestamp;
  final Map<int, int> answers;

  AssessmentResult({
    required this.assessmentId,
    required this.rawScore,
    required this.interpretation,
    required this.severity,
    required this.timestamp,
    required this.answers,
  });

  Map<String, dynamic> toJson() => {
        'assessmentId': assessmentId,
        'rawScore': rawScore,
        'interpretation': interpretation,
        'severity': severity,
        'timestamp': timestamp.toIso8601String(),
        'answers': answers.map((k, v) => MapEntry(k.toString(), v)),
      };

  factory AssessmentResult.fromJson(Map<String, dynamic> json) {
    Map<int, int> answersMap = {};
    if (json['answers'] != null) {
      if (json['answers'] is List) {
        // Legacy format (list of {question, option})
        for (var item in json['answers'] as List) {
          answersMap[item['question'] as int] = item['option'] as int;
        }
      } else if (json['answers'] is Map) {
        // New format (Map<string, int>)
        (json['answers'] as Map<String, dynamic>).forEach((k, v) {
          answersMap[int.parse(k)] = v as int;
        });
      }
    }
    return AssessmentResult(
      assessmentId: json['assessmentId'] as String,
      rawScore: json['rawScore'] as int,
      interpretation: json['interpretation'] as String,
      severity: json['severity'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      answers: answersMap,
    );
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

class AssessmentService {
  static const String _storageKey = 'assessment_history';

  // ─── Scoring Logic (unchanged) ────────────────────────────────────────────

  static AssessmentResult calculateScore(
      String assessmentId, Map<int, int> answers) {
    int score = 0;
    String interpretation = '';
    String severity = '';

    switch (assessmentId) {
      case 'phq9':
        score = answers.values.fold(0, (sum, val) => sum + val);
        if (score >= 20) {
          severity = 'Severe Depression';
          interpretation = 'Immediate treatment likely needed';
        } else if (score >= 15) {
          severity = 'Moderately Severe Depression';
          interpretation = 'Active treatment with pharmacotherapy and/or psychotherapy';
        } else if (score >= 10) {
          severity = 'Moderate Depression';
          interpretation = 'Use clinical judgment';
        } else if (score >= 5) {
          severity = 'Mild Depression';
          interpretation = 'Watchful waiting; repeat PHQ-9 at follow-up';
        } else {
          severity = 'Minimal Depression';
          interpretation = 'No specific treatment action required';
        }
        break;

      case 'gad7':
        score = answers.values.fold(0, (sum, val) => sum + val);
        if (score >= 15) {
          severity = 'Severe Anxiety';
          interpretation = 'Active treatment likely needed';
        } else if (score >= 10) {
          severity = 'Moderate Anxiety';
          interpretation = 'Consider further evaluation';
        } else if (score >= 5) {
          severity = 'Mild Anxiety';
          interpretation = 'Monitor';
        } else {
          severity = 'Minimal Anxiety';
          interpretation = 'No specific action required';
        }
        break;

      case 'pcl5':
        score = answers.values.fold(0, (sum, val) => sum + val);
        if (score >= 33) {
          severity = 'High Probability of PTSD';
          interpretation = 'Provisional diagnosis requires confirmation';
        } else {
          severity = 'Below Threshold';
          interpretation = 'Monitor symptoms';
        }
        break;

      case 'audit':
        score = answers.values.fold(0, (sum, val) => sum + val);
        if (score >= 8) {
          severity = 'Hazardous or Harmful Alcohol Use';
          interpretation = 'Provide brief intervention/referral';
        } else {
          severity = 'Low Risk';
          interpretation = 'Alcohol education';
        }
        break;

      case 'isi':
        score = answers.values.fold(0, (sum, val) => sum + val);
        if (score >= 22) {
          severity = 'Clinical Insomnia (Severe)';
        } else if (score >= 15) {
          severity = 'Clinical Insomnia (Moderate)';
        } else if (score >= 8) {
          severity = 'Subthreshold Insomnia';
        } else {
          severity = 'No Clinically Significant Insomnia';
        }
        interpretation = 'Interpret based on clinical context';
        break;

      default:
        score = answers.values.fold(0, (sum, val) => sum + val);
        severity = 'Completed';
        interpretation = 'Review responses';
    }

    return AssessmentResult(
      assessmentId: assessmentId,
      rawScore: score,
      severity: severity,
      interpretation: interpretation,
      timestamp: DateTime.now(),
      answers: answers,
    );
  }

  // ─── Persistence — saves locally AND syncs to backend ────────────────────

  /// Save assessment result.
  /// Always saves to local SharedPreferences (offline-first).
  /// Also syncs to backend API if [patientId] is provided.
  static Future<void> saveResult(
    AssessmentResult result, {
    String? patientId,
  }) async {
    // 1. Local persistence (offline-first) — encrypted via SecurePhiStorage
    await SecurePhiStorage.instance.appendToList(_storageKey, result.toJson());

    // 2. Backend sync — fire-and-forget (don't block UI on network)
    if (patientId != null) {
      _syncToBackend(result, patientId).catchError((e) {
        debugPrint('Assessment backend sync failed: $e');
      });
    }
  }

  static Future<void> _syncToBackend(
      AssessmentResult result, String patientId) async {
    await ApiClient.instance.post(
      '/patients/$patientId/assessments',
      body: {
        'patient_id': patientId,
        'assessment_id': result.assessmentId,
        'raw_score': result.rawScore,
        'severity': result.severity,
        'interpretation': result.interpretation,
        'answers': result.answers.map((k, v) => MapEntry(k.toString(), v)),
      },
    );
  }

  static Future<List<AssessmentResult>> getHistory() async {
    final results = await SecurePhiStorage.instance.readList<AssessmentResult>(
      _storageKey,
      (json) => AssessmentResult.fromJson(json as Map<String, dynamic>),
    );
    return results..sort((a, b) => b.timestamp.compareTo(a.timestamp));
  }

  static Future<void> clearHistory() async {
    await SecurePhiStorage.instance.delete(_storageKey);
  }
}
