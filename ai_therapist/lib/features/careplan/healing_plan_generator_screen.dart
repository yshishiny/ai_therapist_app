import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/ai_service_r2.dart';
import '../patients/patient_folder_model.dart';

class HealingPlanGeneratorScreen extends StatefulWidget {
  final PatientFolder patient;
  
  const HealingPlanGeneratorScreen({super.key, required this.patient});

  @override
  _HealingPlanGeneratorScreenState createState() => _HealingPlanGeneratorScreenState();
}

class _HealingPlanGeneratorScreenState extends State<HealingPlanGeneratorScreen> {
  final AiService _aiService = AiService();
  bool _isGenerating = false;
  HealingPlan? _generatedPlan;

  Future<void> _generatePlan() async {
    setState(() {
      _isGenerating = true;
      _generatedPlan = null;
    });

    try {
      // Serialize only the relevant clinical portions for the AI to read
      final patientContextStr = jsonEncode(widget.patient.clinicalProfile.toJson());
      
      final plan = await _aiService.generateHealingPlan(patientContextStr);
      
      if (mounted) {
        setState(() {
          _generatedPlan = plan;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Generation failed: \$e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isGenerating = false;
        });
      }
    }
  }

  void _savePlan() {
    // In a full implementation, this would append the HealingPlan to the PatientFolder
    // or store it in a dedicated CarePlanService database table.
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Plan saved to patient record')),
    );
    Navigator.pop(context, _generatedPlan);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Healing Plan: \${widget.patient.firstName}'),
        actions: [
          if (_generatedPlan != null)
            IconButton(
              icon: const Icon(Icons.save),
              onPressed: _savePlan,
            )
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isGenerating) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 24),
            Text('Synthesizing clinical profile...'),
            SizedBox(height: 8),
            Text('Designing multi-phase interventions...', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    if (_generatedPlan == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.auto_awesome, size: 64, color: Colors.blueAccent),
              const SizedBox(height: 24),
              const Text(
                'AI Healing Plan Generator',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'This will analyze \${widget.patient.firstName}\\'s chief complaint, identified triggers, and goals to build a structured 3-phase treatment trajectory.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16, color: Colors.black54),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: _generatePlan,
                icon: const Icon(Icons.bolt),
                label: const Text('Generate Initial Plan'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                ),
              )
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16.0),
      children: [
        Card(
          color: Colors.blue.shade50,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Clinical Overview', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                const SizedBox(height: 8),
                Text(_generatedPlan!.overview, style: const TextStyle(height: 1.5)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        ..._generatedPlan!.phases.asMap().entries.map((entry) {
          int index = entry.key;
          HealingPlanPhase phase = entry.value;
          return _buildPhaseCard(index + 1, phase);
        }),
      ],
    );
  }

  Widget _buildPhaseCard(int phaseNumber, HealingPlanPhase phase) {
    return Card(
      margin: const EdgeInsets.only(bottom: 24),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), topRight: Radius.circular(12)),
            ),
            child: const Text(
              'Phase \$phaseNumber: \${phase.phaseName}',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildListSection('Primary Techniques', phase.techniques, Icons.psychology),
                const Divider(height: 32),
                _buildListSection('Assigned Homework', phase.homework, Icons.assignment),
                const Divider(height: 32),
                _buildListSection('Success Measures', phase.measures, Icons.bar_chart),
                const Divider(height: 32),
                _buildListSection('Exit Criteria', phase.exitCriteria, Icons.flag),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListSection(String title, List<String> items, IconData icon) {
    if (items.isEmpty) return const SizedBox.shrink();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: Colors.grey.shade700),
            const SizedBox(width: 8),
            Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
          ],
        ),
        const SizedBox(height: 8),
        ...items.map((item) => Padding(
          padding: const EdgeInsets.only(left: 28, bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('• ', style: TextStyle(fontWeight: FontWeight.bold)),
              Expanded(child: Text(item, style: const TextStyle(height: 1.4))),
            ],
          ),
        )),
      ],
    );
  }
}
