import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import 'add_patient_screen.dart';
import 'patient_detail_screen.dart';

// ─── Patient model (matches backend PatientOut) ───────────────────────────────

class Patient {
  final String id;
  final String name;
  final String status;
  final String risk;
  final String diagnosis;
  final String lastSeen;

  const Patient({
    required this.id,
    required this.name,
    required this.status,
    required this.risk,
    required this.diagnosis,
    required this.lastSeen,
  });

  factory Patient.fromApi(Map<String, dynamic> json) {
    return Patient(
      id: json['id'] as String,
      name: json['name'] as String,
      status: json['status'] as String? ?? 'Active',
      risk: json['risk'] as String? ?? 'Low',
      diagnosis: json['diagnosis'] as String? ?? '',
      lastSeen: _formatDate(json['last_seen'] as String?),
    );
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

// ─── Patient List Screen — wired to real API ──────────────────────────────────

class PatientListScreen extends StatefulWidget {
  const PatientListScreen({super.key});

  @override
  State<PatientListScreen> createState() => _PatientListScreenState();
}

class _PatientListScreenState extends State<PatientListScreen> {
  List<Patient> _patients = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPatients();
  }

  Future<void> _loadPatients() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final patients = await ApiClient.instance.getJson<List<Patient>>(
        '/patients',
        (data) => (data as List<dynamic>)
            .map((e) => Patient.fromApi(e as Map<String, dynamic>))
            .toList(),
      );
      setState(() { _patients = patients; _isLoading = false; });
    } on ApiException catch (e) {
      setState(() { _error = e.message; _isLoading = false; });
    } catch (e) {
      setState(() { _error = 'Failed to load patients.'; _isLoading = false; });
    }
  }

  Color _riskColor(String risk) {
    switch (risk.toLowerCase()) {
      case 'high':
      case 'crisis':
        return Colors.red;
      case 'medium':
      case 'med':
        return Colors.orange;
      default:
        return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Patient Registry'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPatients,
          ),
        ],
      ),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final added = await Navigator.push<bool>(
            context,
            MaterialPageRoute(builder: (_) => const AddPatientScreen()),
          );
          if (added == true) _loadPatients();
        },
        child: const Icon(Icons.person_add),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loadPatients, child: const Text('Retry')),
          ],
        ),
      );
    }
    if (_patients.isEmpty) {
      return const Center(child: Text('No patients found. Tap + to add one.'));
    }
    return RefreshIndicator(
      onRefresh: _loadPatients,
      child: ListView.separated(
        itemCount: _patients.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final p = _patients[index];
          return ListTile(
            leading: CircleAvatar(child: Text(p.name[0])),
            title: Text(p.name),
            subtitle: Text('${p.diagnosis}  ·  ${p.lastSeen}'),
            trailing: CircleAvatar(
              radius: 6,
              backgroundColor: _riskColor(p.risk),
            ),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => PatientDetailScreen(
                  patientId: p.id,
                  patientName: p.name,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
