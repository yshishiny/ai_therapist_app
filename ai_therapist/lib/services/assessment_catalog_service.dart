import 'dart:convert';

import '../core/api_client.dart';

class AssessmentCatalogItem {
  final String id;
  final String templateKey;
  final String? legacyTemplateId;
  final String name;
  final String? templateType;
  final String? licenseStatus;
  final String? description;
  final bool isActive;
  final String? currentPublishedVersionId;
  final int? currentPublishedVersionNumber;

  const AssessmentCatalogItem({
    required this.id,
    required this.templateKey,
    this.legacyTemplateId,
    required this.name,
    this.templateType,
    this.licenseStatus,
    this.description,
    required this.isActive,
    this.currentPublishedVersionId,
    this.currentPublishedVersionNumber,
  });

  factory AssessmentCatalogItem.fromJson(Map<String, dynamic> json) {
    return AssessmentCatalogItem(
      id: json['id'] as String,
      templateKey: json['template_key'] as String,
      legacyTemplateId: json['legacy_template_id'] as String?,
      name: json['name'] as String,
      templateType: json['template_type'] as String?,
      licenseStatus: json['license_status'] as String?,
      description: json['description'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      currentPublishedVersionId:
          json['current_published_version_id'] as String?,
      currentPublishedVersionNumber:
          json['current_published_version_number'] as int?,
    );
  }
}

class AssessmentVersion {
  final String id;
  final String catalogId;
  final int versionNumber;
  final String status;
  final String name;
  final String? templateType;
  final String? licenseStatus;
  final dynamic definitionJson;
  final dynamic scoringRules;
  final dynamic interpretationRules;
  final String? delivery;
  final String? googleFormUrl;
  final String? notes;
  final String createdAt;
  final String? publishedAt;

  const AssessmentVersion({
    required this.id,
    required this.catalogId,
    required this.versionNumber,
    required this.status,
    required this.name,
    this.templateType,
    this.licenseStatus,
    this.definitionJson,
    this.scoringRules,
    this.interpretationRules,
    this.delivery,
    this.googleFormUrl,
    this.notes,
    required this.createdAt,
    this.publishedAt,
  });

  factory AssessmentVersion.fromJson(Map<String, dynamic> json) {
    return AssessmentVersion(
      id: json['id'] as String,
      catalogId: json['catalog_id'] as String,
      versionNumber: json['version_number'] as int? ?? 0,
      status: json['status'] as String? ?? 'draft',
      name: json['name'] as String? ?? 'Unnamed version',
      templateType: json['template_type'] as String?,
      licenseStatus: json['license_status'] as String?,
      definitionJson: json['definition_json'],
      scoringRules: json['scoring_rules'],
      interpretationRules: json['interpretation_rules'],
      delivery: json['delivery'] as String?,
      googleFormUrl: json['google_form_url'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['created_at'] as String? ?? '',
      publishedAt: json['published_at'] as String?,
    );
  }
}

class AssessmentCatalogService {
  AssessmentCatalogService({ApiClient? apiClient})
      : apiClient = apiClient ?? ApiClient.instance;

  final ApiClient apiClient;

  Future<List<AssessmentCatalogItem>> listCatalog() async {
    final response = await apiClient.get('/admin/assessment-catalog');
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        response.statusCode,
        'Failed to load assessment catalog.',
      );
    }
    final raw = jsonDecode(response.body) as List<dynamic>;
    return raw
        .map(
          (item) => AssessmentCatalogItem.fromJson(
            item as Map<String, dynamic>,
          ),
        )
        .toList();
  }

  Future<AssessmentCatalogItem> createCatalogItem({
    required String templateKey,
    required String name,
    String? templateType,
    String? licenseStatus,
    String? description,
    String? legacyTemplateId,
  }) async {
    final response = await apiClient.post(
      '/admin/assessment-catalog',
      body: {
        'template_key': templateKey,
        'name': name,
        'template_type': templateType,
        'license_status': licenseStatus,
        'description': description,
        'legacy_template_id': legacyTemplateId,
      },
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        response.statusCode,
        'Failed to create catalog item.',
      );
    }
    return AssessmentCatalogItem.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  Future<List<AssessmentVersion>> listVersions(String catalogId) async {
    final response = await apiClient.get(
      '/admin/assessment-catalog/$catalogId/versions',
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        response.statusCode,
        'Failed to load assessment versions.',
      );
    }
    final raw = jsonDecode(response.body) as List<dynamic>;
    return raw
        .map(
          (item) => AssessmentVersion.fromJson(
            item as Map<String, dynamic>,
          ),
        )
        .toList();
  }

  Future<AssessmentVersion> createVersion({
    required String catalogId,
    String? name,
    String? templateType,
    String? licenseStatus,
    dynamic definitionJson,
    dynamic scoringRules,
    dynamic interpretationRules,
    String delivery = 'IN_APP',
    String? googleFormUrl,
    String? notes,
  }) async {
    final response = await apiClient.post(
      '/admin/assessment-catalog/$catalogId/versions',
      body: {
        'name': name,
        'template_type': templateType,
        'license_status': licenseStatus,
        'definition_json': definitionJson,
        'scoring_rules': scoringRules,
        'interpretation_rules': interpretationRules,
        'delivery': delivery,
        'google_form_url': googleFormUrl,
        'notes': notes,
      },
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        response.statusCode,
        'Failed to create assessment version.',
      );
    }
    return AssessmentVersion.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }

  Future<AssessmentVersion> publishVersion(String versionId) async {
    final response = await apiClient.post(
      '/admin/assessment-versions/$versionId/publish',
      body: {},
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        response.statusCode,
        'Failed to publish assessment version.',
      );
    }
    return AssessmentVersion.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
    );
  }
}
