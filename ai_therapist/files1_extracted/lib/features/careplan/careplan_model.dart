class CarePlan {
  final String id;
  final String patientId;
  final List<CarePhase> phases;

  CarePlan({
    required this.id,
    required this.patientId,
    required this.phases,
  });
}

class CarePhase {
  final String title;
  final String description;
  final List<String> interventions;
  final bool isActive;

  CarePhase({
    required this.title,
    required this.description,
    required this.interventions,
    this.isActive = false,
  });
}
