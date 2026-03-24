import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_client.dart';

class CarePlanScreen extends StatefulWidget {
  final String patientId;

  const CarePlanScreen({super.key, required this.patientId});

  @override
  State<CarePlanScreen> createState() => _CarePlanScreenState();
}

class _CarePlanScreenState extends State<CarePlanScreen> {
  Map<String, dynamic>? _carePlan;
  List<dynamic> _phases = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRoadmap();
  }

  Future<void> _fetchRoadmap() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final carePlanId = await ApiClient.instance.get('/patients/${widget.patientId}/careplans/active');
      if (carePlanId.statusCode == 200) {
         final data = jsonDecode(carePlanId.body) as Map<String, dynamic>;
         setState(() {
            _carePlan = data;
            _phases = data['phases'] as List<dynamic>? ?? [];
         });
      } else if (carePlanId.statusCode == 404) {
         setState(() => _error = 'No phased healing roadmap has been generated for this patient yet.');
      } else {
         setState(() => _error = 'Failed to load care plan. Status: ${carePlanId.statusCode}');
      }
    } catch (e) {
      setState(() => _error = 'Network error fetching the roadmap.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF8FB9A8)));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
               Icon(Icons.map_outlined, size: 64, color: Colors.grey.shade300),
               const SizedBox(height: 16),
               Text(
                 _error!,
                 textAlign: TextAlign.center,
                 style: GoogleFonts.inter(color: Colors.grey.shade600),
               ),
               const SizedBox(height: 24),
               ElevatedButton.icon(
                 onPressed: _fetchRoadmap,
                 icon: const Icon(Icons.refresh),
                 label: const Text('Retry'),
                 style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8FB9A8), foregroundColor: Colors.white),
               )
            ],
          ),
        ),
      );
    }

    if (_phases.isEmpty) {
      return Center(
        child: Text('Draft care plan has no phases yet.', style: GoogleFonts.inter(color: Colors.grey)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _phases.length,
      itemBuilder: (context, index) {
        final phase = _phases[index] as Map<String, dynamic>;
        
        // Cycle through standard colors for phases
        final colors = [
           (Colors.blue.shade50, Colors.blue),
           (Colors.purple.shade50, Colors.purple),
           (Colors.green.shade50, Colors.green),
           (Colors.orange.shade50, Colors.orange),
        ];
        
        final colorPair = colors[index % colors.length];
        
        // Parse methods safely
        List<String> methods = [];
        if (phase['methods'] != null) {
           if (phase['methods'] is List) {
              methods = (phase['methods'] as List).map((e) => e.toString()).toList();
           } else if (phase['methods'] is String) {
              methods = [phase['methods'] as String];
           }
        }
        
        final isActive = index == 0 && _carePlan?['status'] == 'ACTIVE';

        return _buildPhaseCard(
          'Phase ${phase["phase_index"] ?? (index+1)}: ${phase["title"] ?? "Core Work"}',
          phase['objectives'] ?? 'No objective specified for this phase.',
          methods,
          colorPair.$1,
          colorPair.$2,
          isActive,
        );
      },
    );
  }

  Widget _buildPhaseCard(String title, String desc, List<String> items, Color bg, Color accent, bool isActive) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(24),
        border: isActive ? Border.all(color: accent, width: 2) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: accent))),
              if (isActive) 
                const Chip(label: Text('ACTIVE', style: TextStyle(fontSize: 10, color: Colors.white)), backgroundColor: Colors.blue),
            ],
          ),
          const SizedBox(height: 12),
          Text(desc, style: TextStyle(color: Colors.grey.shade800, fontSize: 13, height: 1.5)),
          const SizedBox(height: 16),
          ...items.map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.check_circle_outline, size: 16, color: accent),
                const SizedBox(width: 8),
                Expanded(child: Text(item, style: const TextStyle(fontSize: 12))),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
