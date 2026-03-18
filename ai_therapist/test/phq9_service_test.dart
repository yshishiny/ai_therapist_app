// phq9_service_test.dart
// Pure-Dart unit tests for Phq9Service scoring logic and Phq9Severity
// classifications. No device or platform-channel dependencies required.

import 'package:flutter_test/flutter_test.dart';
import 'package:ai_therapist/features/assessments/phq9_service.dart';

void main() {
  // ─── Helper ───────────────────────────────────────────────────────────────

  /// Builds a score map with all 9 questions set to the same [value].
  Map<int, int> uniform(int value) =>
      Map.fromEntries(List.generate(9, (i) => MapEntry(i, value)));

  // ─── score() ──────────────────────────────────────────────────────────────

  group('Phq9Service.score()', () {
    test('all zeros → total 0', () {
      final result = Phq9Service.score(uniform(0));
      expect(result.totalScore, equals(0));
    });

    test('all threes → total 27', () {
      final result = Phq9Service.score(uniform(3));
      expect(result.totalScore, equals(27));
    });

    test('mixed answers sum correctly', () {
      final answers = {0: 1, 1: 2, 2: 3, 3: 0, 4: 1, 5: 2, 6: 3, 7: 0, 8: 1};
      final result = Phq9Service.score(answers);
      expect(result.totalScore, equals(13));
    });
  });

  // ─── severity classifications via score() ─────────────────────────────────

  group('Phq9Severity classification via Phq9Service.score()', () {
    Phq9Severity severityFor(int total) {
      // Build answer map that sums to [total] using the first N questions at 3,
      // and remaining at 0.  Works for 0..27.
      final answers = Map.fromEntries(
        List.generate(9, (i) {
          final remaining = total - (i * 3);
          if (remaining <= 0) return MapEntry(i, 0);
          return MapEntry(i, remaining >= 3 ? 3 : remaining);
        }),
      );
      return Phq9Service.score(answers).severity;
    }

    test('score 0 → minimal', () => expect(severityFor(0), Phq9Severity.minimal));
    test('score 4 → minimal', () => expect(severityFor(4), Phq9Severity.minimal));
    test('score 5 → mild', () => expect(severityFor(5), Phq9Severity.mild));
    test('score 9 → mild', () => expect(severityFor(9), Phq9Severity.mild));
    test('score 10 → moderate', () => expect(severityFor(10), Phq9Severity.moderate));
    test('score 14 → moderate', () => expect(severityFor(14), Phq9Severity.moderate));
    test('score 15 → moderatelySevere', () => expect(severityFor(15), Phq9Severity.moderatelySevere));
    test('score 19 → moderatelySevere', () => expect(severityFor(19), Phq9Severity.moderatelySevere));
    test('score 20 → severe', () => expect(severityFor(20), Phq9Severity.severe));
    test('score 27 → severe', () => expect(severityFor(27), Phq9Severity.severe));
  });

  // ─── Phq9Result computed properties ──────────────────────────────────────

  group('Phq9Result properties', () {
    test('hasSuicidalIdeation = true when question 8 > 0', () {
      final answers = {...uniform(0), 8: 1};
      final result = Phq9Service.score(answers);
      expect(result.hasSuicidalIdeation, isTrue);
    });

    test('hasSuicidalIdeation = false when question 8 == 0', () {
      final result = Phq9Service.score(uniform(0));
      expect(result.hasSuicidalIdeation, isFalse);
    });

    test('symptomCount counts answers >= 2', () {
      final answers = {
        0: 0, 1: 1, 2: 2, 3: 3, 4: 2,
        5: 0, 6: 1, 7: 0, 8: 0,
      };
      final result = Phq9Service.score(answers);
      expect(result.symptomCount, equals(3));
    });

    test('scoreRatio is totalScore / 27', () {
      final result = Phq9Service.score(uniform(3)); // totalScore = 27
      expect(result.scoreRatio, closeTo(1.0, 0.001));
    });

    test('scoreRatio is 0.0 when totalScore = 0', () {
      final result = Phq9Service.score(uniform(0));
      expect(result.scoreRatio, equals(0.0));
    });

    test('scoreRatio ~0.519 for score 14', () {
      // 4 questions at 3 + 1 question at 2 = 14
      final answers = {0: 3, 1: 3, 2: 3, 3: 3, 4: 2, 5: 0, 6: 0, 7: 0, 8: 0};
      final result = Phq9Service.score(answers);
      expect(result.totalScore, equals(14));
      expect(result.scoreRatio, closeTo(14 / 27, 0.001));
    });
  });
}
