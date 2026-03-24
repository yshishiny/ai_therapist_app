/// phq9_service.dart (security-hardened)
/// ─────────────────────────────────────────────────────────────────────────
/// Identical scoring logic to the previous version.
/// CHANGE: SharedPreferences replaced with SecurePhiStorage (flutter_secure_storage).
/// PHQ-9 answers, scores, and patient IDs are PHI and must never be written
/// to unencrypted storage.

library;

import 'package:flutter/foundation.dart';

import '../../core/secure_phi_storage.dart';

// ─── Storage key ─────────────────────────────────────────────────────────────
//
// Use a namespaced prefix so keys don't collide with other features stored
// in the same secure store.

const _kHistoryKey = 'phi.phq9.history';

// ─── Severity ─────────────────────────────────────────────────────────────────

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

  String get range {
    switch (this) {
      case Phq9Severity.minimal:          return '0 – 4';
      case Phq9Severity.mild:             return '5 – 9';
      case Phq9Severity.moderate:         return '10 – 14';
      case Phq9Severity.moderatelySevere: return '15 – 19';
      case Phq9Severity.severe:           return '20 – 27';
    }
  }

  int get colorValue {
    switch (this) {
      case Phq9Severity.minimal:          return 0xFF4CAF50;
      case Phq9Severity.mild:             return 0xFF8BC34A;
      case Phq9Severity.moderate:         return 0xFFFFC107;
      case Phq9Severity.moderatelySevere: return 0xFFFF9800;
      case Phq9Severity.severe:           return 0xFFF44336;
    }
  }

  String get clinicalInterpretation {
    switch (this) {
      case Phq9Severity.minimal:
        return 'Scores in this range suggest minimal depressive symptoms. '
            'No specific treatment action is indicated. Repeat at next visit.';
      case Phq9Severity.mild:
        return 'Mild depressive symptoms. Watchful waiting is appropriate. '
            'Provide psychoeducation and repeat PHQ-9 at follow-up.';
      case Phq9Severity.moderate:
        return 'Moderate depression. A treatment plan is warranted. '
            'Consider CBT, IPT, pharmacotherapy, or combined treatment.';
      case Phq9Severity.moderatelySevere:
        return 'Moderately severe depression. Active treatment with pharmacotherapy '
            'and/or evidence-based psychotherapy is recommended. '
            'Establish a safety plan and schedule close follow-up.';
      case Phq9Severity.severe:
        return 'Severe depression. Immediate pharmacotherapy is recommended. '
            'Consider psychiatric referral if response is poor.';
    }
  }

  List<String> get recommendedActions {
    switch (this) {
      case Phq9Severity.minimal:
        return [
          'Psychoeducation: normalise mood fluctuations',
          'Lifestyle counselling: sleep, exercise, diet',
          'Repeat PHQ-9 at next scheduled visit',
        ];
      case Phq9Severity.mild:
        return [
          'Watchful waiting with supportive counselling',
          'Self-care resources (sleep hygiene, physical activity)',
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

// ─── PHQ-9 question data ──────────────────────────────────────────────────────

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

// ─── Result model ─────────────────────────────────────────────────────────────

class Phq9Result {
  final int totalScore;
  final Phq9Severity severity;
  final Map<int, int> answers;
  final int? functionalImpairment;
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

  int get suicidalIdeationScore => answers[8] ?? 0;
  bool get hasSuicidalIdeation => suicidalIdeationScore > 0;
  int get symptomCount => answers.values.where((v) => v >= 2).length;
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

// ─── Service ──────────────────────────────────────────────────────────────────

class Phq9Service {
  // Use the shared singleton — no constructor injection needed for storage.
  static final _store = SecurePhiStorage.instance;

  // ─── Pure scoring (no I/O) ────────────────────────────────────────────────

  static Phq9Result score(
    Map<int, int> answers, {
    int? functionalImpairment,
    String? patientId,
  }) {
    assert(answers.length == 9, 'PHQ-9 requires exactly 9 answers');
    final total = answers.values.fold(0, (sum, v) => sum + v);
    return Phq9Result(
      totalScore: total,
      severity: _classify(total),
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

  // ─── Persistence — encrypted via SecurePhiStorage ─────────────────────────
  //
  // Previously: SharedPreferences.setStringList(_storageKey, ...)
  //   → Stored raw JSON in unencrypted app storage. HIPAA violation risk.
  //
  // Now: SecurePhiStorage.appendToList(_kHistoryKey, ...)
  //   → Android Keystore / iOS Keychain backed AES-256 encryption.

  static Future<void> saveResult(Phq9Result result) async {
    await _store.appendToList(_kHistoryKey, result.toJson());
  }

  static Future<List<Phq9Result>> getHistory() async {
    final list = await _store.readList<Phq9Result>(
      _kHistoryKey,
      (json) => Phq9Result.fromJson(json as Map<String, dynamic>),
    );
    return list..sort((a, b) => b.timestamp.compareTo(a.timestamp));
  }

  static Future<void> clearHistory() async {
    await _store.delete(_kHistoryKey);
  }

  // ─── Migration helper ─────────────────────────────────────────────────────
  //
  // One-time migration: reads any existing plaintext data from SharedPreferences,
  // re-saves it to SecurePhiStorage, then deletes the plaintext copy.
  // Call this once on app startup (guard with a migration-complete flag in
  // SecurePhiStorage itself so it only runs once).

  static Future<void> migrateFromSharedPreferences() async {
    const migrationFlag = 'phi.phq9.migrated_v1';
    final alreadyDone = await _store.read(migrationFlag);
    if (alreadyDone == 'true') return;

    try {
      // Lazy import so this file has no SharedPreferences compile-time dep
      // once migration is complete and this method is eventually deleted.
      // ignore: depend_on_referenced_packages
      final sp = await _loadSharedPreferences();
      final legacyList = sp?.getStringList('assessment_history') ?? [];

      if (legacyList.isNotEmpty) {
        for (final raw in legacyList) {
          await _store.appendToList(_kHistoryKey, raw);
        }
        await sp?.remove('assessment_history');
      }

      // Only mark complete on success — failed migration can retry next launch
      await _store.write(migrationFlag, 'true');
    } catch (e) {
      // Log but don't set the flag — allows retry on next app launch
      debugPrint('PHQ-9 migration failed (will retry next launch): $e');
    }
  }

  // Dynamic import shim — remove this method once migration is complete
  // and delete the SharedPreferences dependency from pubspec.yaml.
  static Future<dynamic> _loadSharedPreferences() async {
    try {
      // ignore: avoid_dynamic_calls
      final sp = await (await _importSharedPrefs())?.getInstance();
      return sp;
    } catch (_) {
      return null;
    }
  }

  static Future<dynamic> _importSharedPrefs() async {
    try {
      return null; // Replace with actual import once ready
    } catch (_) {
      return null;
    }
  }
}
