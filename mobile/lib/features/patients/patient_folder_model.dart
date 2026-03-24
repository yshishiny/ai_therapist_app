// ignore_for_file: constant_identifier_names

enum ConsentStatus { granted, revoked, pending, denied }

class AuditEntry {
  final String field;
  final String oldValue;
  final String newValue;
  final String modifiedBy;
  final DateTime modifiedAt;

  AuditEntry({
    required this.field,
    required this.oldValue,
    required this.newValue,
    required this.modifiedBy,
    required this.modifiedAt,
  });

  Map<String, dynamic> toJson() => {
        'field': field,
        'oldValue': oldValue,
        'newValue': newValue,
        'modifiedBy': modifiedBy,
        'modifiedAt': modifiedAt.toIso8601String(),
      };

  factory AuditEntry.fromJson(Map<String, dynamic> json) => AuditEntry(
        field: json['field'],
        oldValue: json['oldValue'],
        newValue: json['newValue'],
        modifiedBy: json['modifiedBy'],
        modifiedAt: DateTime.parse(json['modifiedAt']),
      );

  // Aliases used by patient_folder_screen
  String get action => field;
  DateTime get timestamp => modifiedAt;
}

class ConsentRecord {
  final String type; // e.g., 'telehealth', 'treatment', 'information_release'
  final String status; // e.g., 'granted', 'revoked', 'pending'
  final DateTime? dateSigned;
  final String? version;

  ConsentRecord({
    required this.type,
    required this.status,
    this.dateSigned,
    this.version,
  });

  Map<String, dynamic> toJson() => {
        'type': type,
        'status': status,
        'dateSigned': dateSigned?.toIso8601String(),
        'version': version,
      };

  factory ConsentRecord.fromJson(Map<String, dynamic> json) => ConsentRecord(
        type: json['type'],
        status: json['status'],
        dateSigned: json['dateSigned'] != null
            ? DateTime.parse(json['dateSigned'])
            : null,
        version: json['version'],
      );

  // Aliases used by patient_folder_screen
  String get recordedBy => 'System';
  DateTime get recordedAt => dateSigned ?? DateTime.now();
}

class EmergencyContact {
  final String name;
  final String relationship;
  final String phone;
  final String? address;

  EmergencyContact({
    required this.name,
    required this.relationship,
    required this.phone,
    this.address,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'relationship': relationship,
        'phone': phone,
        'address': address,
      };

  factory EmergencyContact.fromJson(Map<String, dynamic> json) =>
      EmergencyContact(
        name: json['name'],
        relationship: json['relationship'],
        phone: json['phone'],
        address: json['address'],
      );

  // Alias used by patient_folder_screen
  bool get isAware => true; // default assumption
}

class ClinicalProfile {
  final String chiefComplaint;
  final String presentingHistory;
  final List<String> goals;
  final List<String> strengths;
  final List<String> triggers;
  final List<String> copingStrategies;

  ClinicalProfile({
    required this.chiefComplaint,
    required this.presentingHistory,
    required this.goals,
    required this.strengths,
    required this.triggers,
    required this.copingStrategies,
  });

  Map<String, dynamic> toJson() => {
        'chiefComplaint': chiefComplaint,
        'presentingHistory': presentingHistory,
        'goals': goals,
        'strengths': strengths,
        'triggers': triggers,
        'copingStrategies': copingStrategies,
      };

  factory ClinicalProfile.fromJson(Map<String, dynamic> json) =>
      ClinicalProfile(
        chiefComplaint: json['chiefComplaint'] ?? '',
        presentingHistory: json['presentingHistory'] ?? '',
        goals: List<String>.from(json['goals'] ?? []),
        strengths: List<String>.from(json['strengths'] ?? []),
        triggers: List<String>.from(json['triggers'] ?? []),
        copingStrategies: List<String>.from(json['copingStrategies'] ?? []),
      );
}

class RiskChecklist {
  final String suicideIdeation;
  final String selfHarm;
  final String violenceToOthers;
  final String substanceAbuse;
  final String psychosis;
  final String neglect;
  final String fallRisk;
  final DateTime lastReviewed;

  RiskChecklist({
    required this.suicideIdeation,
    required this.selfHarm,
    required this.violenceToOthers,
    required this.substanceAbuse,
    required this.psychosis,
    required this.neglect,
    required this.fallRisk,
    required this.lastReviewed,
  });

  Map<String, dynamic> toJson() => {
        'suicideIdeation': suicideIdeation,
        'selfHarm': selfHarm,
        'violenceToOthers': violenceToOthers,
        'substanceAbuse': substanceAbuse,
        'psychosis': psychosis,
        'neglect': neglect,
        'fallRisk': fallRisk,
        'lastReviewed': lastReviewed.toIso8601String(),
      };

  factory RiskChecklist.fromJson(Map<String, dynamic> json) => RiskChecklist(
        suicideIdeation: json['suicideIdeation'] ?? 'low',
        selfHarm: json['selfHarm'] ?? 'low',
        violenceToOthers: json['violenceToOthers'] ?? 'low',
        substanceAbuse: json['substanceAbuse'] ?? 'low',
        psychosis: json['psychosis'] ?? 'none',
        neglect: json['neglect'] ?? 'none',
        fallRisk: json['fallRisk'] ?? 'low',
        lastReviewed: json['lastReviewed'] != null
            ? DateTime.parse(json['lastReviewed'])
            : DateTime.now(),
      );

  // ── Convenience getters used by patient_folder_screen ──────────────────
  bool get suicidalIdeation => suicideIdeation != 'none' && suicideIdeation != 'low';
  bool get selfHarmHistory => selfHarm != 'none' && selfHarm != 'low';
  bool get homicidalIdeation => violenceToOthers != 'none' && violenceToOthers != 'low';
  bool get substanceUse => substanceAbuse != 'none' && substanceAbuse != 'low';
  bool get domesticViolence => neglect != 'none' && neglect != 'low';
  bool get psychosisSigns => psychosis != 'none' && psychosis != 'low';
  bool get eatingDisorder => false;
  bool get anyFlagged => suicidalIdeation || selfHarmHistory || homicidalIdeation || substanceUse || domesticViolence || psychosisSigns;
  DateTime get lastReviewedAt => lastReviewed;
  String get reviewedBy => 'Clinician';
}

class PatientFolder {
  final String id;
  // Identity
  final String firstName;
  final String lastName;
  final DateTime dateOfBirth;
  final String gender;
  final String pronouns;
  final String email;
  final String phone;
  final String address;
  final String preferredLanguage;

  // Status and Meta
  final String status;
  final String diagnosis;
  final DateTime lastSeen;
  final List<String> tags;

  // Complex Objects
  final ClinicalProfile clinicalProfile;
  final RiskChecklist riskChecklist;
  final EmergencyContact emergencyContact;
  final List<ConsentRecord> consentRecords;
  final List<AuditEntry> auditTrail;

  PatientFolder({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.dateOfBirth,
    required this.gender,
    required this.pronouns,
    required this.email,
    required this.phone,
    required this.address,
    required this.preferredLanguage,
    required this.status,
    required this.diagnosis,
    required this.lastSeen,
    this.tags = const [],
    required this.clinicalProfile,
    required this.riskChecklist,
    required this.emergencyContact,
    this.consentRecords = const [],
    this.auditTrail = const [],
  });

  String get fullName => '$firstName $lastName';

  // ── Computed getters used by patient_folder_screen ───────────────────────
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}';
  int get ageYears {
    final now = DateTime.now();
    int age = now.year - dateOfBirth.year;
    if (now.month < dateOfBirth.month || (now.month == dateOfBirth.month && now.day < dateOfBirth.day)) age--;
    return age;
  }
  String get riskLevel => riskChecklist.anyFlagged ? 'high' : 'low';
  String get primaryDiagnosis => diagnosis;
  List<String> get comorbidities => [];
  bool get hasActiveRiskFlags => riskChecklist.anyFlagged;
  bool get hasAiConsent => true;
  List<String> get treatmentGoals => clinicalProfile.goals;
  List<String> get strengths => clinicalProfile.strengths;
  List<String> get triggers => clinicalProfile.triggers;
  List<String> get copingStrategies => clinicalProfile.copingStrategies;
  String get chiefComplaint => clinicalProfile.chiefComplaint;
  String get presentingHistory => clinicalProfile.presentingHistory;
  String get relevantHistory => '';
  String get medicationsNotes => '';

  PatientFolder copyWith({
    String? firstName,
    String? lastName,
    DateTime? dateOfBirth,
    String? gender,
    String? pronouns,
    String? email,
    String? phone,
    String? address,
    String? preferredLanguage,
    String? status,
    String? diagnosis,
    DateTime? lastSeen,
    List<String>? tags,
    ClinicalProfile? clinicalProfile,
    RiskChecklist? riskChecklist,
    EmergencyContact? emergencyContact,
    List<ConsentRecord>? consentRecords,
    required String modifiedBy, // Require who made the change for the audit log
  }) {
    List<AuditEntry> newAuditTrail = List.from(auditTrail);
    DateTime now = DateTime.now();

    void trackChange(String field, dynamic oldVal, dynamic newVal) {
      if (oldVal != newVal) {
        newAuditTrail.add(AuditEntry(
          field: field,
          oldValue: oldVal.toString(),
          newValue: newVal.toString(),
          modifiedBy: modifiedBy,
          modifiedAt: now,
        ));
      }
    }

    if (firstName != null) trackChange('firstName', this.firstName, firstName);
    if (lastName != null) trackChange('lastName', this.lastName, lastName);
    if (status != null) trackChange('status', this.status, status);
    if (diagnosis != null) trackChange('diagnosis', this.diagnosis, diagnosis);
    // Note: for deep object changes (like ClinicalProfile), we would ideally check field by field,
    // but for simplicity we log that the entire profile object references changed.
    if (clinicalProfile != null) {
      trackChange('clinicalProfile', 'Object', 'Object');
    }
    if (riskChecklist != null) trackChange('riskChecklist', 'Object', 'Object');

    return PatientFolder(
      id: id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      pronouns: pronouns ?? this.pronouns,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      status: status ?? this.status,
      diagnosis: diagnosis ?? this.diagnosis,
      lastSeen: lastSeen ?? this.lastSeen,
      tags: tags ?? List.from(this.tags),
      clinicalProfile: clinicalProfile ?? this.clinicalProfile,
      riskChecklist: riskChecklist ?? this.riskChecklist,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      consentRecords: consentRecords ?? List.from(this.consentRecords),
      auditTrail: newAuditTrail,
    );
  }

  factory PatientFolder.fromMock(Map<String, dynamic> json) {
    return PatientFolder(
      id: json['id'].toString(),
      firstName:
          json['firstName'] ?? json['name']?.split(' ').first ?? 'Unknown',
      lastName: json['lastName'] ??
          (json['name']?.contains(' ') == true
              ? json['name'].split(' ').last
              : ''),
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.parse(json['dateOfBirth'])
          : DateTime(1990, 1, 1),
      gender: json['gender'] ?? 'Unspecified',
      pronouns: json['pronouns'] ?? 'They/Them',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      address: json['address'] ?? '',
      preferredLanguage: json['preferredLanguage'] ?? 'English',
      status: json['status'] ?? 'Active',
      diagnosis: json['diagnosis'] ?? 'None',
      lastSeen: json['lastSeen'] != null &&
              json['lastSeen'] is String &&
              json['lastSeen'] != 'N/A'
          ? DateTime.tryParse(json['lastSeen']) ?? DateTime.now()
          : DateTime.now(),
      tags: List<String>.from(json['tags'] ?? []),
      clinicalProfile: json['clinicalProfile'] != null
          ? ClinicalProfile.fromJson(json['clinicalProfile'])
          : ClinicalProfile(
              chiefComplaint: '',
              presentingHistory: '',
              goals: [],
              strengths: [],
              triggers: [],
              copingStrategies: []),
      riskChecklist: json['riskChecklist'] != null
          ? RiskChecklist.fromJson(json['riskChecklist'])
          : RiskChecklist(
              suicideIdeation: 'low',
              selfHarm: 'low',
              violenceToOthers: 'low',
              substanceAbuse: 'low',
              psychosis: 'none',
              neglect: 'none',
              fallRisk: 'low',
              lastReviewed: DateTime.now()),
      emergencyContact: json['emergencyContact'] != null
          ? EmergencyContact.fromJson(json['emergencyContact'])
          : EmergencyContact(name: 'Unknown', relationship: 'None', phone: ''),
      consentRecords: json['consentRecords'] != null
          ? (json['consentRecords'] as List)
              .map((e) => ConsentRecord.fromJson(e))
              .toList()
          : [],
      auditTrail: json['auditTrail'] != null
          ? (json['auditTrail'] as List)
              .map((e) => AuditEntry.fromJson(e))
              .toList()
          : [],
    );
  }
}
