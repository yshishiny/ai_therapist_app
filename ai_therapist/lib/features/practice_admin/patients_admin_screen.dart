library;

import 'package:flutter/material.dart';

import '../../services/patient_assignment_service.dart';

class PatientsAdminScreen extends StatefulWidget {
  const PatientsAdminScreen({super.key});

  @override
  State<PatientsAdminScreen> createState() => _PatientsAdminScreenState();
}

class _PatientsAdminScreenState extends State<PatientsAdminScreen> {
  final _patientIdCtrl = TextEditingController();
  final _clinicianIdCtrl = TextEditingController();
  final _careTeamPatientIdCtrl = TextEditingController();
  final _service = PatientAssignmentService();

  bool _isPrimary = true;
  bool _loading = false;
  List<Map<String, dynamic>> _careTeam = const [];
  String? _message;
  String? _error;

  @override
  void dispose() {
    _patientIdCtrl.dispose();
    _clinicianIdCtrl.dispose();
    _careTeamPatientIdCtrl.dispose();
    super.dispose();
  }

  Future<void> _assignPatient() async {
    final patientId = _patientIdCtrl.text.trim();
    final clinicianId = _clinicianIdCtrl.text.trim();
    if (patientId.isEmpty || clinicianId.isEmpty) {
      setState(() => _error = 'Enter both patient and clinician IDs.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
      _message = null;
    });

    try {
      await _service.assignPatient(
        patientId: patientId,
        clinicianId: clinicianId,
        isPrimary: _isPrimary,
      );
      setState(() => _message = 'Patient assigned successfully.');
    } catch (_) {
      setState(() => _error = 'Assignment failed.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _loadCareTeam() async {
    final patientId = _careTeamPatientIdCtrl.text.trim();
    if (patientId.isEmpty) {
      setState(() => _error = 'Enter a patient ID to load the care team.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
      _message = null;
    });

    try {
      final rows = await _service.getPatientCareTeam(patientId);
      setState(() => _careTeam = rows);
    } catch (_) {
      setState(() => _error = 'Could not load care team.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Patient assignment admin',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Assign patients to clinicians and inspect the current care team.',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _patientIdCtrl,
            decoration: const InputDecoration(
              labelText: 'Patient ID',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _clinicianIdCtrl,
            decoration: const InputDecoration(
              labelText: 'Clinician ID',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            value: _isPrimary,
            onChanged: (value) => setState(() => _isPrimary = value),
            title: const Text('Primary clinician assignment'),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _loading ? null : _assignPatient,
            child: const Text('Assign patient'),
          ),
          const SizedBox(height: 20),
          const Divider(),
          const SizedBox(height: 12),
          TextField(
            controller: _careTeamPatientIdCtrl,
            decoration: const InputDecoration(
              labelText: 'Patient ID for care team',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: _loading ? null : _loadCareTeam,
            child: const Text('Load care team'),
          ),
          const SizedBox(height: 16),
          if (_message != null)
            Text(_message!, style: const TextStyle(color: Colors.green)),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Center(child: CircularProgressIndicator()),
            ),
          if (_careTeam.isNotEmpty)
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _careTeam.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, index) {
                final member = _careTeam[index];
                final role = member['role'] as String? ?? 'clinician';
                final email = member['email'] as String? ?? '';
                return ListTile(
                  title: Text(email.isEmpty ? 'Clinician' : email),
                  subtitle: Text(role),
                  trailing: member['is_primary'] == true
                      ? const Chip(label: Text('Primary'))
                      : null,
                );
              },
            ),
        ],
      ),
    );
  }
}
