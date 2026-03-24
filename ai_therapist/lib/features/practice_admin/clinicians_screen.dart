library;

import 'package:flutter/material.dart';

import '../../services/patient_assignment_service.dart';

class CliniciansScreen extends StatefulWidget {
  const CliniciansScreen({super.key});

  @override
  State<CliniciansScreen> createState() => _CliniciansScreenState();
}

class _CliniciansScreenState extends State<CliniciansScreen> {
  final _clinicianIdCtrl = TextEditingController();
  final _service = PatientAssignmentService();
  List<Map<String, dynamic>> _patients = const [];
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _clinicianIdCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAssignedPatients() async {
    final clinicianId = _clinicianIdCtrl.text.trim();
    if (clinicianId.isEmpty) {
      setState(() => _error = 'Enter a clinician ID to load assignments.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final patients = await _service.getClinicianPatients(clinicianId);
      setState(() => _patients = patients);
    } catch (e) {
      setState(() => _error = 'Could not load assigned patients.');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Clinician assignments',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Load the patients currently assigned to a clinician.',
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _clinicianIdCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Clinician ID',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: _loading ? null : _loadAssignedPatients,
                child: const Text('Load'),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red)),
          if (_loading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_patients.isEmpty)
            const Expanded(
              child: Center(
                child: Text('No assigned patients loaded yet.'),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                itemCount: _patients.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (_, index) {
                  final patient = _patients[index];
                  final name = patient['full_name'] as String? ?? 'Unknown patient';
                  final status = patient['status'] as String? ?? 'Unknown';
                  final isPrimary = patient['is_primary'] == true;
                  return ListTile(
                    title: Text(name),
                    subtitle: Text(status),
                    trailing: isPrimary
                        ? const Chip(label: Text('Primary'))
                        : null,
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
