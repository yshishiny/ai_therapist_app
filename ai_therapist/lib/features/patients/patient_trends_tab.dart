import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/api_client.dart';

class PatientTrendsTab extends StatefulWidget {
  final String patientId;
  const PatientTrendsTab({super.key, required this.patientId});

  @override
  State<PatientTrendsTab> createState() => _PatientTrendsTabState();
}

class _PatientTrendsTabState extends State<PatientTrendsTab> {
  bool _loading = true;
  String? _error;
  List<dynamic> _assessments = [];
  String _selectedTemplate = 'gad7'; // Default graph

  @override
  void initState() {
    super.initState();
    _fetchAssessments();
  }

  Future<void> _fetchAssessments() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final resp = await ApiClient.instance.get('/patients/\${widget.patientId}/assessments');
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body) as List<dynamic>;
        setState(() {
          _assessments = data;
          
          // Auto-select the most common test if available
          if (data.isNotEmpty) {
             final grouped = <String, int>{};
             for (var a in data) {
                final tid = a['template_id'] as String;
                grouped[tid] = (grouped[tid] ?? 0) + 1;
             }
             _selectedTemplate = grouped.entries.reduce((a, b) => a.value > b.value ? a : b).key;
          }
        });
      } else {
        setState(() => _error = 'Failed to load trends.');
      }
    } catch (e) {
      setState(() => _error = 'Network error fetching trends.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF8FB9A8)));
    if (_error != null) return Center(child: Text(_error!, style: const TextStyle(color: Colors.red)));

    final filteredData = _assessments.where((a) => a['template_id'] == _selectedTemplate).toList()
      ..sort((a, b) => DateTime.parse(a['taken_at']).compareTo(DateTime.parse(b['taken_at'])));

    // Extract unique templates for the dropdown
    final templateIds = _assessments.map((a) => a['template_id'] as String).toSet().toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Longitudinal Severity', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
              if (templateIds.isNotEmpty)
                DropdownButton<String>(
                  value: _selectedTemplate,
                  underline: const SizedBox(),
                  icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF8FB9A8)),
                  style: GoogleFonts.inter(color: const Color(0xFF8FB9A8), fontWeight: FontWeight.bold),
                  items: templateIds.map((tid) => DropdownMenuItem(value: tid, child: Text(tid.toUpperCase()))).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedTemplate = val);
                  },
                ),
            ],
          ),
          const SizedBox(height: 24),
          if (filteredData.isEmpty)
            Container(
               height: 200,
               decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(16)),
               child: const Center(child: Text('No assessments logged for this metric yet.')),
            )
          else 
            _buildChart(filteredData),
            
          const SizedBox(height: 32),
          Text('Assessment History', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          ...filteredData.reversed.map((a) {
             final date = DateTime.parse(a['taken_at']);
             final dateStr = "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
             return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                child: ListTile(
                   leading: CircleAvatar(
                      backgroundColor: const Color(0xFF8FB9A8).withValues(alpha: 0.1),
                      child: Text(a['score_total']?.toString() ?? '-', style: const TextStyle(color: Color(0xFF8FB9A8), fontWeight: FontWeight.bold)),
                   ),
                   title: Text(a['severity_band'] ?? 'Scored', style: const TextStyle(fontWeight: FontWeight.bold)),
                   subtitle: Text("Context: ${a['context']} • $dateStr"),
                   trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
                ),
             );
          }),
        ],
      ),
    );
  }

  Widget _buildChart(List<dynamic> data) {
    if (data.length < 2) {
      return Container(
         height: 200,
         alignment: Alignment.center,
         child: const Text('Not enough data points to plot a trend line. Check back after your next assessment.'),
      );
    }

    final spots = <FlSpot>[];
    double idx = 0;
    double maxScore = 0;
    
    for (var a in data) {
       final score = (a['score_total'] as num?)?.toDouble() ?? 0.0;
       if (score > maxScore) maxScore = score;
       spots.add(FlSpot(idx, score));
       idx++;
    }

    return Container(
      height: 250,
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
      decoration: BoxDecoration(
         color: Colors.white,
         borderRadius: BorderRadius.circular(20),
         border: Border.all(color: Colors.grey.shade200),
         boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))
         ]
      ),
      child: LineChart(
        LineChartData(
          gridData: const FlGridData(show: false),
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
               sideTitles: SideTitles(showTitles: true, getTitlesWidget: (val, meta) {
                  if (val.toInt() >= 0 && val.toInt() < data.length) {
                     final date = DateTime.parse(data[val.toInt()]['taken_at']);
                     return Padding(
                       padding: const EdgeInsets.only(top: 8.0),
                       child: Text("${date.month}/${date.day}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
                     );
                  }
                  return const Text('');
               }, reservedSize: 30)
            ),
          ),
          borderData: FlBorderData(show: false),
          minX: 0,
          maxX: (data.length - 1).toDouble(),
          minY: 0,
          maxY: maxScore + (maxScore * 0.2), // 20% headroom
          lineBarsData: [
            LineChartBarData(
              spots: spots,
              isCurved: true,
              color: const Color(0xFF8FB9A8),
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: const FlDotData(show: true),
              belowBarData: BarAreaData(
                show: true,
                color: const Color(0xFF8FB9A8).withValues(alpha: 0.1),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
