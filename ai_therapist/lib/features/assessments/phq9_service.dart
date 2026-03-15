import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

// ─── Severity bands per Kroenke et al. (2001) & APA Practice Guidelines ────

enum Phq9Severity {
  minimal,
  mild,
  moderate,
  moderatelySevere,
  severe,
}

extension Phq9SeverityExt on Phq9Severity {
  String get label {
    switch (this) {
      case Phq9Severity.minimal:          return 'Minimal';
      case Phq9Severity.mild:             return 'Mild';
      case Phq9Severity.moderate:         return 'Moderate';
      case Phq9Severity.moderatelySevere: return 'Moderately Severe';
      case Phq9Severity.severe:           return 'Severe';
    }
  }

  /// Score range for display
  String get range {
    switch (this) {
      case Phq9Severity.minimal:          return '0 – 4';
      case Phq9Severity.mild:             return '5 – 9';
      case Phq9Severity.moderate:         return '10 – 14';
      case Phq9Severity.moderatelySevere: return '15 – 19';
      case Phq9Severity.severe:           return '20 – 27';
    }
  }

  /// Primary hex color for the severity band
  int get colorValue {
    switch (this) {
      case Phq9Severity.minimal:          return 0xFF4CAF50; // green
      case Phq9Severity.mild:             return 0xFF8BC34A; // light-green
      case Phq9Severity.moderate:         return 0xFFFFC107; // amber
      case Phq9Severity.moderatelySevere: return 0xFFFF9800; // orange
      case Phq9Severity.severe:           return 0xFFF44336; // red
    }
  }

  /// APA-aligned clinical interpretation (concise for clinician card)
  String get clinicalInterpretation {
    switch (this) {
      case Phq9Severity.minimal:
        return 'Scores in this range suggest minimal depressive symptoms. '
            'No specific treatment action is indicated at this time. '
            'Consider re-administering at the next scheduled visit.';
      case Phq9Severity.mild:
        return 'Mild depressive symptoms noted. Watchful waiting is appropriate. '
            'Provide psychoeducation about depression and self-care strategies. '
            'Repeat the PHQ-9 at the next follow-up appointment.';
      case Phq9Severity.moderate:
        return 'Moderate depression detected. A treatment plan is warranted. '
            'Consider counseling (e.g., CBT, IPT), pharmacotherapy, or combined '
            'treatment depending on patient preference, clinical history, and '
            'symptom duration.';
      case Phq9Severity.moderatelySevere:
        return 'Moderately severe depression. Active treatment with pharmacotherapy '
            'and/or evidence-based psychotherapy (e.g., CBT) is recommended. '
            'Establish a safety plan and schedule a close follow-up within 2–4 weeks.';
      case Phq9Severity.severe:
        return 'Severe depression. Immediate initiation of pharmacotherapy is '
            'recommended. If severe functional impairment persists or response to '
            'initial treatment is poor, expedite referral to a psychiatrist or '
            'mental health specialist.';
    }
  }

  /// Bullet action items for the recommendations card
  List<String> get recommendedActions {
    switch (this) {
      case Phq9Severity.minimal:
        return [
          'Psychoeducation: normalize mood fluctuations',
          'Lifestyle counseling: sleep, exercise, diet',
          'Repeat PHQ-9 at next scheduled visit',
        ];
      case Phq9Severity.mild:
        return [
          'Watchful waiting with supportive counseling',
          'Provide self-care resources (sleep hygiene, physical activity)',
          'Repeat PHQ-9 in 2–4 weeks',
          'Consider brief structured therapy if symptoms persist',
        ];
      case Phq9Severity.moderate:
        return [
          'Initiate evidence-based psychotherapy (CBT or IPT)',
          'Consider pharmacotherapy based on patient history',
          'Document functional impairment and symptom duration',
          'Follow-up within 4–6 weeks; repeat PHQ-9',
          'Assess for comorbid anxiety or substance use',
        ];
      case Phq9Severity.moderatelySevere:
        return [
          'Begin pharmacotherapy (SSRI/SNRI as first-line)',
          'Initiate structured psychotherapy concurrently',
          'Establish and document a written safety plan',
          'Schedule follow-up within 2–4 weeks',
          'Repeat PHQ-9 at every visit to track response',
          'Screen for bipolar disorder before prescribing',
        ];
      case Phq9Severity.severe:
        return [
          'Immediate pharmacotherapy initiation',
          'Consider psychiatric consultation or referral',
          'Assess need for higher level of care (IOP/inpatient)',
          'Complete a formal suicide risk assessment',
          'Daily or weekly contact during acute phase',
          'Involve family/support network where appropriate',
        ];
    }
  }
}

// ─── DSM-5 symptom domains (for per-item breakdown display) ─────────────────

const List<String> phq9Domains = [
  'Anhedonia',
  'Depressed mood',
  'Sleep disturbance',
  'Fatigue / energy loss',
  'Appetite / weight changes',
  'Worthlessness / guilt',
  'Concentration difficulties',
  'Psychomotor changes',
  'Suicidal ideation',
];

const List<String> phq9Questions = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure or have let '
      'yourself or your family down',
  'Trouble concentrating on things, such as reading the newspaper or '
      'watching television',
  'Moving or speaking so slowly that other people could have noticed?\n'
      'Or the opposite — being so fidgety or restless that you have been '
      'moving around a lot more than usual',
  'Thoughts that you would be better off dead, or of hurting yourself '
      'in some way',
];

const List<String> phq9Options = [
  'Not at all',
  'Several days',
  'More than half the days',
  'Nearly every day',
];

// Optional 10th question (functional impairment)
const String phq9FunctionalQuestion =
    'If you checked off any problems, how difficult have these problems made '
    'it for you to do your work, take care of things at home, or get along '
    'with other people?';

const List<String> phq9FunctionalOptions = [
  'Not difficult at all',
  'Somewhat difficult',
  'Very difficult',
  'Extremely difficult',
];

// ─── Result model ────────────────────────────────────────────────────────────

class Phq9Result {
  final int totalScore;                // 0–27
  final Phq9Severity severity;
  final Map<int, int> answers;         // question index → option index (0–3)
  final int? functionalImpairment;     // 0–3, null if skipped
  final DateTime timestamp;
  final String? patientId;

  Phq9Result({
    required this.totalScore,
    required this.severity,
    required this.answers,
    this.functionalImpairment,
    required this.timestamp,
    this.patientId,
  });

  /// Item 9 (index 8) score — any value > 0 triggers a safety alert
  int get suicidalIdeationScore => answers[8] ?? 0;
  bool get hasSuicidalIdeation => suicidalIdeationScore > 0;

  /// How many items scored ≥ 2 (clinically meaningful frequency)
  int get symptomCount =>
      answers.values.where((v) => v >= 2).length;

  /// Percentage of maximum score (27) for gauge rendering
  double get scoreRatio => totalScore / 27.0;

  Map<String, dynamic> toJson() => {
        'totalScore': totalScore,
        'severity': severity.name,
        'answers': answers.map((k, v) => MapEntry(k.toString(), v)),
        'functionalImpairment': functionalImpairment,
        'timestamp': timestamp.toIso8601String(),
        'patientId': patientId,
      };

  factory Phq9Result.fromJson(Map<String, dynamic> json) {
    final answersRaw = json['answers'] as Map<String, dynamic>;
    return Phq9Result(
      totalScore: json['totalScore'] as int,
      severity: Phq9Severity.values
          .firstWhere((e) => e.name == json['severity']),
      answers: answersRaw.map(
          (k, v) => MapEntry(int.parse(k), v as int)),
      functionalImpairment: json['functionalImpairment'] as int?,
      timestamp: DateTime.parse(json['timestamp'] as String),
      patientId: json['patientId'] as String?,
    );
  }
}

// ─── Scoring service ─────────────────────────────────────────────────────────

class Phq9Service {
  static const String _storageKey = 'phq9_history';

  /// Pure scoring — no side effects
  static Phq9Result score(
    Map<int, int> answers, {
    int? functionalImpairment,
    String? patientId,
  }) {
    assert(answers.length == 9, 'PHQ-9 requires exactly 9 answers');

    final total = answers.values.fold(0, (sum, v) => sum + v);

    final severity = _classify(total);

    return Phq9Result(
      totalScore: total,
      severity: severity,
      answers: Map.from(answers),
      functionalImpairment: functionalImpairment,
      timestamp: DateTime.now(),
      patientId: patientId,
    );
  }

  static Phq9Severity _classify(int score) {
    if (score >= 20) return Phq9Severity.severe;
    if (score >= 15) return Phq9Severity.moderatelySevere;
    if (score >= 10) return Phq9Severity.moderate;
    if (score >= 5)  return Phq9Severity.mild;
    return Phq9Severity.minimal;
  }

  // ─── Persistence ───────────────────────────────────────────────────────────

  static Future<void> saveResult(Phq9Result result) async {
    final prefs = await SharedPreferences.getInstance();
    final history = prefs.getStringList(_storageKey) ?? [];
    history.add(jsonEncode(result.toJson()));
    await prefs.setStringList(_storageKey, history);
  }

  static Future<List<Phq9Result>> getHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final history = prefs.getStringList(_storageKey) ?? [];
    return history
        .map((e) => Phq9Result.fromJson(jsonDecode(e)))
        .toList()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
  }

  static Future<void> clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
  }
}
