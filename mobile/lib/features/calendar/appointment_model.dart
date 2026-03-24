class Appointment {
  final String id;
  final String patientName;
  final DateTime startTime;
  final String type;
  final String label;

  Appointment({
    required this.id,
    required this.patientName,
    required this.startTime,
    required this.type,
    required this.label,
  });
}
