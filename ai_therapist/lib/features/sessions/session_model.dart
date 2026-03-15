class Session {
  final String id;
  final String patientId;
  final DateTime date;
  final String transcript;
  final String summary;
  final Map<String, String> soapNote;

  Session({
    required this.id,
    required this.patientId,
    required this.date,
    this.transcript = '',
    this.summary = '',
    this.soapNote = const {},
  });
}
