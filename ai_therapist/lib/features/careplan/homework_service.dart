import '../../core/ai_service_r2.dart';

enum HomeworkStatus { assigned, inProgress, completed, skipped, partiallyDone }

class PatientFeedback {
  final int completionPercentage; // 0 to 100
  final int difficultyRating; // 1 to 5
  final int helpfulnessRating; // 1 to 5
  final List<String> barriers;
  final String additionalComments;

  PatientFeedback({
    required this.completionPercentage,
    required this.difficultyRating,
    required this.helpfulnessRating,
    this.barriers = const [],
    this.additionalComments = '',
  });

  Map<String, dynamic> toJson() => {
        'completionPercentage': completionPercentage,
        'difficultyRating': difficultyRating,
        'helpfulnessRating': helpfulnessRating,
        'barriers': barriers,
        'additionalComments': additionalComments,
      };

  factory PatientFeedback.fromJson(Map<String, dynamic> json) =>
      PatientFeedback(
        completionPercentage: json['completionPercentage'] ?? 0,
        difficultyRating: json['difficultyRating'] ?? 3,
        helpfulnessRating: json['helpfulnessRating'] ?? 3,
        barriers: List<String>.from(json['barriers'] ?? []),
        additionalComments: json['additionalComments'] ?? '',
      );
}

class HomeworkAssignment {
  final String id;
  final String patientId;
  final String sessionId;
  final HomeworkProposal proposalDetails;
  HomeworkStatus status;
  final DateTime assignedAt;
  DateTime? dueAt;
  PatientFeedback? feedback;

  HomeworkAssignment({
    required this.id,
    required this.patientId,
    required this.sessionId,
    required this.proposalDetails,
    this.status = HomeworkStatus.assigned,
    required this.assignedAt,
    this.dueAt,
    this.feedback,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'patientId': patientId,
        'sessionId': sessionId,
        'proposalDetails': {
          'title': proposalDetails.title,
          'description': proposalDetails.description,
          'difficulty': proposalDetails.difficulty,
          'frequency': proposalDetails.frequency,
          'rationale': proposalDetails.rationale,
        },
        'status': status.name,
        'assignedAt': assignedAt.toIso8601String(),
        'dueAt': dueAt?.toIso8601String(),
        'feedback': feedback?.toJson(),
      };

  factory HomeworkAssignment.fromJson(Map<String, dynamic> json) =>
      HomeworkAssignment(
        id: json['id'],
        patientId: json['patientId'],
        sessionId: json['sessionId'],
        proposalDetails: HomeworkProposal.fromJson(json['proposalDetails']),
        status: HomeworkStatus.values.firstWhere(
          (e) => e.name == json['status'],
          orElse: () => HomeworkStatus.assigned,
        ),
        assignedAt: DateTime.parse(json['assignedAt']),
        dueAt: json['dueAt'] != null ? DateTime.parse(json['dueAt']) : null,
        feedback: json['feedback'] != null
            ? PatientFeedback.fromJson(json['feedback'])
            : null,
      );
}

class AdherenceSummary {
  final int totalAssigned;
  final int totalCompleted;
  final int totalSkipped;
  final int totalPartiallyDone;
  final double averageCompletionPercentage;
  final double averageDifficulty;
  final List<String> mostCommonBarriers;

  AdherenceSummary({
    required this.totalAssigned,
    required this.totalCompleted,
    required this.totalSkipped,
    required this.totalPartiallyDone,
    required this.averageCompletionPercentage,
    required this.averageDifficulty,
    required this.mostCommonBarriers,
  });

  // ─── Computed shorthands ────────────────────────────────────────────────────
  int    get completed      => totalCompleted;
  int    get skipped        => totalSkipped;
  int    get partiallyDone  => totalPartiallyDone;
  double get completionRate =>
      totalAssigned == 0 ? 0.0 : totalCompleted / totalAssigned;

  factory AdherenceSummary.generate(List<HomeworkAssignment> assignments) {
    if (assignments.isEmpty) {
      return AdherenceSummary(
        totalAssigned: 0,
        totalCompleted: 0,
        totalSkipped: 0,
        totalPartiallyDone: 0,
        averageCompletionPercentage: 0.0,
        averageDifficulty: 0.0,
        mostCommonBarriers: [],
      );
    }

    int completed = 0;
    int skipped = 0;
    int partial = 0;
    int totalPct = 0;
    int totalDiff = 0;
    int feedbackCount = 0;
    Map<String, int> barrierCounts = {};

    for (var a in assignments) {
      if (a.status == HomeworkStatus.completed) completed++;
      if (a.status == HomeworkStatus.skipped) skipped++;
      if (a.status == HomeworkStatus.partiallyDone) partial++;

      if (a.feedback != null) {
        feedbackCount++;
        totalPct += a.feedback!.completionPercentage;
        totalDiff += a.feedback!.difficultyRating;

        for (var b in a.feedback!.barriers) {
          barrierCounts[b] = (barrierCounts[b] ?? 0) + 1;
        }
      }
    }

    List<String> sortedBarriers = barrierCounts.keys.toList()
      ..sort((a, b) => barrierCounts[b]!.compareTo(barrierCounts[a]!));

    return AdherenceSummary(
      totalAssigned: assignments.length,
      totalCompleted: completed,
      totalSkipped: skipped,
      totalPartiallyDone: partial,
      averageCompletionPercentage:
          feedbackCount > 0 ? (totalPct / feedbackCount) : 0.0,
      averageDifficulty: feedbackCount > 0 ? (totalDiff / feedbackCount) : 0.0,
      mostCommonBarriers: sortedBarriers.take(3).toList(),
    );
  }
}

// ─── Shared in-memory store (used by static helpers below) ────────────────────

final _sharedStore = _SimpleHomeworkStore();

class _SimpleHomeworkStore {
  final List<HomeworkAssignment> _db = [];
  List<HomeworkAssignment> forPatient(String id) =>
      _db.where((a) => a.patientId == id).toList();
  AdherenceSummary adherence(String id) =>
      AdherenceSummary.generate(forPatient(id));
}

class HomeworkService {
  final AiService _aiService;

  // In-memory store for demonstration. Should be backed by a local DB or backend.
  final List<HomeworkAssignment> _homeworkDatabase = [];

  HomeworkService(this._aiService);

  // ─── Static convenience helpers ───────────────────────────────────────────

  /// Returns all assignments for a patient from the shared in-memory store.
  static Future<List<HomeworkAssignment>> getTasksForPatient(
      String patientId) async =>
      _sharedStore.forPatient(patientId);

  /// Returns an [AdherenceSummary] for a patient. Always safe to use —
  /// returns zeros if no assignments exist.
  static Future<AdherenceSummary> getAdherenceSummary(
      String patientId) async =>
      _sharedStore.adherence(patientId);

  // ─── Instance methods ─────────────────────────────────────────────────────

  Future<HomeworkAssignment> assignHomework({
    required String patientId,
    required String sessionId,
    required HomeworkProposal proposal,
    DateTime? dueAt,
  }) async {
    final assignment = HomeworkAssignment(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      patientId: patientId,
      sessionId: sessionId,
      proposalDetails: proposal,
      assignedAt: DateTime.now(),
      dueAt: dueAt,
    );

    _homeworkDatabase.add(assignment);
    return assignment;
  }

  Future<HomeworkAssignment?> updateStatus(
      String assignmentId, HomeworkStatus newStatus) async {
    final index = _homeworkDatabase.indexWhere((a) => a.id == assignmentId);
    if (index == -1) return null;

    _homeworkDatabase[index].status = newStatus;
    return _homeworkDatabase[index];
  }

  Future<HomeworkAssignment?> submitPatientFeedback(
      String assignmentId, PatientFeedback feedback) async {
    final index = _homeworkDatabase.indexWhere((a) => a.id == assignmentId);
    if (index == -1) return null;

    final assignment = _homeworkDatabase[index];
    assignment.feedback = feedback;

    if (feedback.completionPercentage == 100) {
      assignment.status = HomeworkStatus.completed;
    } else if (feedback.completionPercentage == 0) {
      assignment.status = HomeworkStatus.skipped;
    } else {
      assignment.status = HomeworkStatus.partiallyDone;
    }

    return assignment;
  }

  List<HomeworkAssignment> getPatientAssignments(String patientId) {
    return _homeworkDatabase.where((a) => a.patientId == patientId).toList();
  }

  AdherenceSummary generateAdherenceSummary(String patientId) {
    final assignments = getPatientAssignments(patientId);
    return AdherenceSummary.generate(assignments);
  }

  Future<List<HomeworkProposal>> suggestHomeworkAdjustment(
      String patientId) async {
    final summary = generateAdherenceSummary(patientId);

    if (summary.mostCommonBarriers.isEmpty &&
        summary.averageCompletionPercentage > 75) {
      return await _aiService.proposeHomework(
          'Patient with high compliance seeking next level challenge.');
    }

    final barrierString = summary.mostCommonBarriers.join(', ');
    final context =
        'Patient has completion rate of ${summary.averageCompletionPercentage.toStringAsFixed(1)}%. '
        'Primary reported barriers are: $barrierString. '
        'Previous average difficulty rating was ${summary.averageDifficulty.toStringAsFixed(1)}/5.';

    return await _aiService
        .proposeHomework('Homework adjustment needed. Context: $context');
  }
}
