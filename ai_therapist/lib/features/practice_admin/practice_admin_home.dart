library;

import 'package:flutter/material.dart';

import '../../services/permission_service.dart';
import '../dashboard/admin_dashboard_screen.dart';
import 'clinicians_screen.dart';
import 'patients_admin_screen.dart';

class PracticeAdminHome extends StatelessWidget {
  const PracticeAdminHome({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Practice Admin'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'Clinicians'),
              Tab(text: 'Patients'),
              Tab(text: 'Access'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _OverviewTab(),
            CliniciansScreen(),
            PatientsAdminScreen(),
            AccessControlTab(),
          ],
        ),
      ),
    );
  }
}

class _OverviewTab extends StatelessWidget {
  const _OverviewTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Sprint 1 access foundation',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        const Text(
          'This admin shell adds permissions and patient assignment controls '
          'while preserving the current patient and clinician experience.',
        ),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Legacy admin tools',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Resources, contacts, and assessment-question management stay available during migration.',
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => const AdminDashboardScreen(),
                      ),
                    );
                  },
                  child: const Text('Open legacy admin tools'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class AccessControlTab extends StatefulWidget {
  const AccessControlTab({super.key});

  @override
  State<AccessControlTab> createState() => _AccessControlTabState();
}

class _AccessControlTabState extends State<AccessControlTab> {
  final _service = PermissionService();
  final _searchCtrl = TextEditingController();

  bool _loading = true;
  String? _error;
  AccessControlSnapshot? _snapshot;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final snapshot = await _service.loadAccessControlSnapshot();
      if (!mounted) return;
      setState(() => _snapshot = snapshot);
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Could not load access controls.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return _ErrorState(message: _error!, onRetry: _load);
    }

    final snapshot = _snapshot;
    if (snapshot == null) {
      return _ErrorState(message: 'No access snapshot available.', onRetry: _load);
    }

    final query = _searchCtrl.text.trim().toLowerCase();
    final catalog = snapshot.catalog.where((item) {
      if (query.isEmpty) return true;
      return item.key.toLowerCase().contains(query) ||
          item.description.toLowerCase().contains(query);
    }).toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    final allowed = snapshot.effectivePermissions.permissions.toSet();
    final overrides = snapshot.effectivePermissions.overrides;
    final allowedCount = snapshot.catalog.where((item) => allowed.contains(item.key)).length;

    final grouped = <String, List<PermissionCatalogItem>>{};
    for (final item in catalog) {
      final group = PermissionService.permissionGroupForKey(item.key);
      grouped.putIfAbsent(group, () => []).add(item);
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _HeaderCard(
            userId: snapshot.userId,
            role: snapshot.role,
            allowedCount: allowedCount,
            totalCount: snapshot.catalog.length,
            overrideCount: overrides.length,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _searchCtrl,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Search permissions',
              hintText: 'assessment, patient.view, billing...',
              border: OutlineInputBorder(),
              prefixIcon: Icon(Icons.search),
            ),
          ),
          const SizedBox(height: 16),
          _LegendRow(),
          const SizedBox(height: 16),
          ...grouped.entries.map(
            (entry) => Card(
              clipBehavior: Clip.antiAlias,
              child: ExpansionTile(
                initiallyExpanded: entry.key == 'Patients',
                title: Text(entry.key),
                subtitle: Text('${entry.value.length} permission${entry.value.length == 1 ? '' : 's'}'),
                children: entry.value
                    .map(
                      (item) => _PermissionTile(
                        item: item,
                        isAllowed: allowed.contains(item.key),
                        overrideEffect: _overrideFor(overrides, item.key),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
          if (overrides.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              'Explicit overrides',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            ...overrides.map(
              (override) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  override.effect == 'ALLOW' ? Icons.check_circle : Icons.remove_circle,
                  color: override.effect == 'ALLOW' ? Colors.green : Colors.red,
                ),
                title: Text(override.permissionKey),
                subtitle: Text('Override effect: ${override.effect}'),
                trailing: override.createdAt != null
                    ? Text(
                        _formatDate(override.createdAt!),
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      )
                    : null,
              ),
            ),
          ],
          if (catalog.isEmpty)
            const Padding(
              padding: EdgeInsets.only(top: 24),
              child: Center(child: Text('No permissions matched your search.')),
            ),
        ],
      ),
    );
  }

  String? _overrideFor(List<UserPermissionOverride> overrides, String key) {
    for (final item in overrides) {
      if (item.permissionKey == key) return item.effect;
    }
    return null;
  }

  String _formatDate(DateTime dateTime) {
    final local = dateTime.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '${local.year}-$month-$day $hour:$minute';
  }
}

class _HeaderCard extends StatelessWidget {
  final String userId;
  final String role;
  final int allowedCount;
  final int totalCount;
  final int overrideCount;

  const _HeaderCard({
    required this.userId,
    required this.role,
    required this.allowedCount,
    required this.totalCount,
    required this.overrideCount,
  });

  @override
  Widget build(BuildContext context) {
    final roleLabel = role.toUpperCase();
    return Card(
      color: const Color(0xFFF6F7FB),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.verified_user_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Signed in as $roleLabel',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _shortId(userId),
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _MetricChip(
                  label: 'Allowed',
                  value: '$allowedCount / $totalCount',
                  color: Colors.green,
                ),
                _MetricChip(
                  label: 'Overrides',
                  value: '$overrideCount',
                  color: Colors.blue,
                ),
                _MetricChip(
                  label: 'Role',
                  value: roleLabel,
                  color: const Color(0xFF2D3250),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _shortId(String value) {
    if (value.length <= 12) return value;
    return '${value.substring(0, 8)}...${value.substring(value.length - 4)}';
  }
}

class _MetricChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MetricChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: color)),
          Text(
            value,
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

class _LegendRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        _LegendChip(label: 'Allowed', color: Colors.green),
        _LegendChip(label: 'Denied / Not included', color: Colors.red),
        _LegendChip(label: 'Explicit override', color: Colors.blue),
      ],
    );
  }
}

class _LegendChip extends StatelessWidget {
  final String label;
  final Color color;

  const _LegendChip({
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.24)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _PermissionTile extends StatelessWidget {
  final PermissionCatalogItem item;
  final bool isAllowed;
  final String? overrideEffect;

  const _PermissionTile({
    required this.item,
    required this.isAllowed,
    required this.overrideEffect,
  });

  @override
  Widget build(BuildContext context) {
    final color = isAllowed ? Colors.green : Colors.red;
    final icon = isAllowed ? Icons.check_circle_outline : Icons.block_outlined;

    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(item.key),
      subtitle: Text(item.description),
      trailing: overrideEffect == null
          ? const Icon(Icons.chevron_right, color: Colors.grey)
          : Chip(
              label: Text(overrideEffect!),
              visualDensity: VisualDensity.compact,
              backgroundColor: overrideEffect == 'ALLOW'
                  ? Colors.green.withValues(alpha: 0.1)
                  : Colors.red.withValues(alpha: 0.1),
            ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
