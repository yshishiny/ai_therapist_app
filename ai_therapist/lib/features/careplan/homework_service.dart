import 'dart:convert';
import '../../core/api_client.dart';
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

  int get completionPercent => completionPercentage;
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

  String get title => proposalDetails.title;
  String get description => proposalDetails.description;
  String get frequencyGuide => proposalDetails.frequency;
  bool get isOverdue =>
      dueAt != null &&
      dueAt!.isBefore(DateTime.now()) &&
      status != HomeworkStatus.completed;
}

typedef HomeworkTask = HomeworkAssignment;

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

// (Class definitions for PatientFeedback, HomeworkAssignment, AdherenceSummary remain unchanged)

class HomeworkService {
  final AiService _aiService;

  HomeworkService(this._aiService);

  // ─── Static convenience helpers ───────────────────────────────────────────

  /// Returns all assignments for a patient from the Railway backend.
  static Future<List<HomeworkAssignment>> getTasksForPatient(String patientId) async {
    try {
      final resp = await ApiClient.instance.get('/patients/$patientId/homework');
      if (resp.statusCode == 200) {
        final raw = jsonDecode(resp.body) as List<dynamic>;
        // Map backend response specifically to the Dart model
        return raw.map((json) => HomeworkAssignment(
          id: json['id'],
          patientId: json['patient_id'],
          sessionId: json['careplan_phase_id'] ?? '', // Mapping phase as session for legacy reasons
          proposalDetails: HomeworkProposal(
            title: json['title'] ?? 'Task',
            description: json['instructions'] ?? '',
            difficulty: 'Medium',
            frequency: 'Once',
            rationale: 'System generated',
          ),
          status: HomeworkStatus.values.firstWhere(
            (e) => e.name.toUpperCase() == (json['status'] ?? 'ASSIGNED').toString().toUpperCase(),
            orElse: () => HomeworkStatus.assigned,
          ),
          assignedAt: DateTime.now(), // Fallback
          dueAt: json['due_date'] != null ? DateTime.parse(json['due_date']) : null,
          feedback: json['patient_feedback'] != null 
             ? PatientFeedback.fromJson(json['patient_feedback']) 
             : null,
        )).toList();
      }
    } catch (e) {
      // Handle network errors gracefully
    }
    return [];
  }

  /// Returns an [AdherenceSummary] for a patient.
  static Future<AdherenceSummary> getAdherenceSummary(String patientId) async {
    final assignments = await getTasksForPatient(patientId);
    return AdherenceSummary.generate(assignments);
  }

  // ─── Instance & Static Mutators ──────────────────────────────────────────

  Future<HomeworkAssignment> assignHomework({
    required String patientId,
    required String sessionId,
    required HomeworkProposal proposal,
    DateTime? dueAt,
  }) async {
    final resp = await ApiClient.instance.post(
      '/patients/$patientId/homework',
      body: jsonEncode({
        'title': proposal.title,
        'instructions': proposal.description,
        'due_date': dueAt?.toIso8601String().split('T')[0],
      }),
    );
    
    final newId = jsonDecode(resp.body)['id'] ?? DateTime.now().millisecondsSinceEpoch.toString();

    return HomeworkAssignment(
      id: newId,
      patientId: patientId,
      sessionId: sessionId,
      proposalDetails: proposal,
      assignedAt: DateTime.now(),
      dueAt: dueAt,
    );
  }

  static Future<bool> updateStatus(String assignmentId, HomeworkStatus newStatus) async {
     // Optional: implement a direct status patch if needed, or rely on feedback form.
     return true;
  }

  static Future<HomeworkAssignment?> submitPatientFeedback(
      String assignmentId, PatientFeedback feedback) async {
    
    await ApiClient.instance.post(
      '/homework/$assignmentId/feedback',
      body: jsonEncode({
        'completionPercentage': feedback.completionPercentage,
        'difficultyRating': feedback.difficultyRating,
        'helpfulnessRating': feedback.helpfulnessRating,
        'barriers': feedback.barriers,
        'additionalComments': feedback.additionalComments,
      }),
    );
    return null; // The UI usually refetches the tasks list immediately
  }

  Future<AdherenceSummary> generateAdherenceSummary(String patientId) async {
    return await HomeworkService.getAdherenceSummary(patientId);
  }

  Future<List<HomeworkProposal>> suggestHomeworkAdjustment(
      String patientId) async {
    final summary = await generateAdherenceSummary(patientId);

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
