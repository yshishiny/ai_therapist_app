class Patient {
  final String id;
  final String name;
  final String status;
  final String risk;
  final String diagnosis;
  final String lastSeen;
  final List<String> tags;

  Patient({
    required this.id,
    required this.name,
    required this.status,
    required this.risk,
    required this.diagnosis,
    required this.lastSeen,
    this.tags = const [],
  });

  factory Patient.fromMock(Map<String, dynamic> json) {
    return Patient(
      id: json['id'].toString(),
      name: json['name'],
      status: json['status'],
      risk: json['risk'],
      diagnosis: json['diagnosis'],
      lastSeen: json['lastSeen'] ?? 'N/A',
      tags: List<String>.from(json['tags'] ?? []),
    );
  }
}
