/// patient_model.dart
/// Unified Patient model with both API and mock factories.

class Patient {
  final String id;
  final String name;
  final String status;
  final String risk;
  final String diagnosis;
  final String lastSeen;
  final List<String> tags;

  const Patient({
    required this.id,
    required this.name,
    required this.status,
    required this.risk,
    required this.diagnosis,
    required this.lastSeen,
    this.tags = const [],
  });

  /// Construct from backend API response (PatientOut schema).
  factory Patient.fromApi(Map<String, dynamic> json) {
    return Patient(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String? ?? 'Active',
      risk: _normaliseRisk(json['risk'] as String? ?? 'Low'),
      diagnosis: json['diagnosis'] as String? ?? '',
      lastSeen: _formatDate(json['last_seen'] as String?),
      tags: const [],
    );
  }

  /// Legacy factory for local/mock data.
  factory Patient.fromMock(Map<String, dynamic> json) {
    return Patient(
      id: json['id'].toString(),
      name: json['name'] as String,
      status: json['status'] as String,
      risk: json['risk'] as String,
      diagnosis: json['diagnosis'] as String,
      lastSeen: json['lastSeen'] as String? ?? 'N/A',
      tags: List<String>.from(json['tags'] as List? ?? []),
    );
  }

  static String _normaliseRisk(String raw) {
    switch (raw.toLowerCase()) {
      case 'high':   return 'High';
      case 'medium':
      case 'med':    return 'Med';
      case 'crisis': return 'Crisis';
      default:       return 'Low';
    }
  }

  static String _formatDate(String? iso) {
    if (iso == null) return 'N/A';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inDays == 0) return 'Today';
      if (diff.inDays == 1) return 'Yesterday';
      if (diff.inDays < 7) return '${diff.inDays} days ago';
      return '${(diff.inDays / 7).round()} week(s) ago';
    } catch (_) {
      return 'N/A';
    }
  }
}
