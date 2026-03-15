import 'package:flutter/material.dart';
import 'add_patient_screen.dart';

class Patient {
  final String id;
  final String name;
  final String status;
  final String risk;
  final String diagnosis;

  Patient({
    required this.id,
    required this.name,
    required this.status,
    required this.risk,
    required this.diagnosis,
  });
}

class PatientListScreen extends StatelessWidget {
  final List<Patient> patients = [
    Patient(
        id: '1',
        name: 'Sarah Johnson',
        status: 'Active',
        risk: 'High',
        diagnosis: 'GAD / Panic Disorder'),
    Patient(
        id: '2',
        name: 'Ahmed Hassan',
        status: 'Active',
        risk: 'Low',
        diagnosis: 'C-PTSD / MDD'),
    Patient(
        id: '3',
        name: 'Laila Mahmoud',
        status: 'Paused',
        risk: 'Med',
        diagnosis: 'Social Anxiety'),
  ];

  PatientListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Patient Registry'),
      ),
      body: ListView.separated(
        itemCount: patients.length,
        separatorBuilder: (context, index) => const Divider(),
        itemBuilder: (context, index) {
          final p = patients[index];
          return ListTile(
            leading: CircleAvatar(child: Text(p.name[0])),
            title: Text(p.name),
            subtitle: Text(p.diagnosis),
            trailing: _buildRiskIndicator(p.risk),
            onTap: () {},
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AddPatientScreen()),
          );
        },
        child: const Icon(Icons.person_add),
      ),
    );
  }

  Widget _buildRiskIndicator(String risk) {
    Color color = Colors.green;
    if (risk == 'High') color = Colors.red;
    if (risk == 'Med') color = Colors.orange;
    return CircleAvatar(radius: 5, backgroundColor: color);
  }
}
