library;

import '../core/api_client.dart';

class PermissionCatalogItem {
  final String key;
  final String description;

  const PermissionCatalogItem({
    required this.key,
    required this.description,
  });

  factory PermissionCatalogItem.fromJson(Map<String, dynamic> json) {
    return PermissionCatalogItem(
      key: json['key'] as String? ?? '',
      description: json['description'] as String? ?? '',
    );
  }
}

class UserPermissionOverride {
  final String permissionKey;
  final String effect;
  final DateTime? createdAt;

  const UserPermissionOverride({
    required this.permissionKey,
    required this.effect,
    required this.createdAt,
  });

  factory UserPermissionOverride.fromJson(Map<String, dynamic> json) {
    return UserPermissionOverride(
      permissionKey: json['permission_key'] as String? ?? '',
      effect: json['effect'] as String? ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}

class EffectivePermissions {
  final String role;
  final List<String> permissions;
  final List<UserPermissionOverride> overrides;

  const EffectivePermissions({
    required this.role,
    required this.permissions,
    required this.overrides,
  });

  factory EffectivePermissions.fromJson(Map<String, dynamic> json) {
    return EffectivePermissions(
      role: json['role'] as String? ?? 'clinician',
      permissions: (json['permissions'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      overrides: (json['overrides'] as List<dynamic>? ?? const [])
          .map((item) => UserPermissionOverride.fromJson(
                item as Map<String, dynamic>,
              ))
          .toList(),
    );
  }

  bool allows(String key) => permissions.contains(key);
}

class AccessControlSnapshot {
  final String userId;
  final String role;
  final List<PermissionCatalogItem> catalog;
  final EffectivePermissions effectivePermissions;

  const AccessControlSnapshot({
    required this.userId,
    required this.role,
    required this.catalog,
    required this.effectivePermissions,
  });
}

class PermissionService {
  static String permissionGroupForKey(String key) {
    if (key.startsWith('assessment.')) return 'Assessments';
    if (key.startsWith('resource.') || key.startsWith('content.')) {
      return 'Content & Resources';
    }
    if (key.startsWith('patient.')) return 'Patients';
    if (key.startsWith('billing.')) return 'Billing';
    if (key.startsWith('audit.')) return 'Audit';
    return 'Platform';
  }

  Future<List<PermissionCatalogItem>> getPermissionCatalog() async {
    final data = await ApiClient.instance.getJsonList('/admin/permissions');
    return data
        .map((item) => PermissionCatalogItem.fromJson(
              item as Map<String, dynamic>,
            ))
        .toList();
  }

  Future<List<String>> getRoles() async {
    final data = await ApiClient.instance.getJsonList('/admin/roles');
    return data.map((item) => item.toString()).toList();
  }

  Future<EffectivePermissions> getUserPermissions({
    required String userId,
    required String role,
  }) async {
    final data = await ApiClient.instance
        .getJsonMap('/admin/users/$userId/permissions?role=$role');
    return EffectivePermissions.fromJson(data);
  }

  Future<UserPermissionOverride> setUserPermissionOverride({
    required String userId,
    required String permissionKey,
    required String effect,
  }) async {
    final data = await ApiClient.instance.postJsonMap(
      '/admin/users/$userId/permissions',
      body: {
        'permission_key': permissionKey,
        'effect': effect,
      },
    );
    return UserPermissionOverride.fromJson(data);
  }

  Future<AccessControlSnapshot> loadAccessControlSnapshot() async {
    final userId = await ApiClient.instance.getStoredUserId();
    final role = (await ApiClient.instance.getStoredRole()) ?? 'clinician';
    if (userId == null) {
      throw const ApiException(401, 'Missing stored user ID.');
    }

    final results = await Future.wait<dynamic>([
      getUserPermissions(userId: userId, role: role),
      getPermissionCatalog(),
    ]);

    return AccessControlSnapshot(
      userId: userId,
      role: role,
      effectivePermissions: results[0] as EffectivePermissions,
      catalog: results[1] as List<PermissionCatalogItem>,
    );
  }
}
