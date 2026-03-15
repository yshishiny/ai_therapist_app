import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

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
        'answers': answers.entries
            .map((e) => {'question': e.key, 'option': e.value})
            .toList(),
      };

  factory AssessmentResult.fromJson(Map<String, dynamic> json) {
    var answersMap = <int, int>{};
    if (json['answers'] != null) {
      for (var item in json['answers']) {
        answersMap[item['question']] = item['option'];
      }
    }
    return AssessmentResult(
      assessmentId: json['assessmentId'],
      rawScore: json['rawScore'],
      interpretation: json['interpretation'],
      severity: json['severity'],
      timestamp: DateTime.parse(json['timestamp']),
      answers: answersMap,
    );
  }
}

class AssessmentService {
  static const String _storageKey = 'assessment_history';

  // Scoring Logic
  static AssessmentResult calculateScore(
      String assessmentId, Map<int, int> answers) {
    int score = 0;
    String interpretation = '';
    String severity = '';

    // Calculate Raw Score
    switch (assessmentId) {
      case 'phq9': // PHQ-9: 0-3 per question
        score = answers.values.fold(0, (sum, val) => sum + val);
        if (score >= 20) {
          severity = 'Severe Depression';
          interpretation = 'Immediate treatment likely needed';
        } else if (score >= 15) {
          severity = 'Moderately Severe Depression';
          interpretation =
              'Active treatment with pharmacotherapy and/or psychotherapy';
        } else if (score >= 10) {
          severity = 'Moderate Depression';
          interpretation =
              'Use clinical judgment (symptom duration, functional impairment)';
        } else if (score >= 5) {
          severity = 'Mild Depression';
          interpretation = 'Watchful waiting; repeat PHQ-9 at follow-up';
        } else {
          severity = 'Minimal Depression';
          interpretation = 'No specific treatment action required';
        }
        break;

      case 'gad7': // GAD-7: 0-3 per question
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

      case 'gds': // GDS: Yes/No (0/1). Some are reverse scored.
        // GDS Short Form (15 items) scoring:
        // Score 1 point for "Yes" on: 2, 3, 4, 6, 8, 9, 10, 12, 14, 15 (0-indexed: 1, 2, 3, 5, 7, 8, 9, 11, 13, 14)
        // Score 1 point for "No" on: 1, 5, 7, 11, 13 (0-indexed: 0, 4, 6, 10, 12)
        // Note: Yes is index 0 in UI options ['Yes', 'No']?
        // Wait, yesNoOptions = ['Yes', 'No']. So Yes=0, No=1.

        final yesIndices = {
          1,
          2,
          3,
          5,
          7,
          8,
          9,
          11,
          13,
          14
        }; // Score if Yes (0)
        final noIndices = {0, 4, 6, 10, 12}; // Score if No (1)

        answers.forEach((qIndex, optionIndex) {
          if (yesIndices.contains(qIndex) && optionIndex == 0) score++;
          if (noIndices.contains(qIndex) && optionIndex == 1) score++;
        });

        if (score >= 10) {
          severity = 'Suggestive of Depression';
          interpretation = 'Further evaluation required';
        } else if (score >= 5) {
          severity = 'Suggestive of Depression';
          interpretation = 'Warrants follow-up';
        } else {
          severity = 'Normal';
          interpretation = 'No indication of depression';
        }
        // GDS standard: >5 is suggestive.
        break;

      case 'pcl5': // PCL-5: 0-4 per question
        score = answers.values.fold(0, (sum, val) => sum + val);
        if (score >= 33) {
          severity = 'High Probability of PTSD';
          interpretation = 'Provisional diagnosis requires confirmation';
        } else {
          severity = 'Below Threshold';
          interpretation = 'Monitor symptoms';
        }
        break;

      case 'audit': // AUDIT: 0-4 per question (simplified)
        score = answers.values.fold(0, (sum, val) => sum + val);
        if (score >= 8) {
          // 8 is a common cutoff for hazardous/harmful alcohol use
          severity = 'Hazardous or Harmful Alcohol Use';
          interpretation = 'Provide brief intervention/referral';
        } else {
          severity = 'Low Risk';
          interpretation = 'Alcohol education';
        }
        break;

      case 'isi': // ISI: 0-4 per question
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

      case 'mdq': // MDQ: Yes/No (0/1).
        // Standard MDQ scoring is complex (7+ symptoms + co-occurrence + impairment).
        // Since we only have symptoms:
        // Count Yes (assuming index 0 is Yes).
        int positiveSymptoms = 0;
        answers.forEach((_, optionIndex) {
          if (optionIndex == 0) positiveSymptoms++;
        });
        score = positiveSymptoms;

        if (score >= 7) {
          severity = 'Positive Screen (Likely Bipolar)';
          interpretation =
              'Further evaluation for Bipolar Disorder recommended (requires co-occurrence check)';
        } else {
          severity = 'Negative Screen';
          interpretation = 'Symptoms unlikely to represent Bipolar Disorder';
        }
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

  // Persistence
  static Future<void> saveResult(AssessmentResult result) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> history = prefs.getStringList(_storageKey) ?? [];

    history.add(jsonEncode(result.toJson()));
    await prefs.setStringList(_storageKey, history);
  }

  static Future<List<AssessmentResult>> getHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> history = prefs.getStringList(_storageKey) ?? [];

    return history.map((e) => AssessmentResult.fromJson(jsonDecode(e))).toList()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp)); // Newest first
  }

  static Future<void> clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}
