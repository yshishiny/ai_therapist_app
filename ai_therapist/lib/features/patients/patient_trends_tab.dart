import 'dart:convert';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

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
  List<_AssessmentTrendPoint> _assessments = [];
  String? _selectedAssessmentId;

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
      final resp =
          await ApiClient.instance.get('/patients/${widget.patientId}/assessments');
      if (resp.statusCode != 200) {
        setState(() => _error = 'Failed to load trends.');
        return;
      }

      final data = (jsonDecode(resp.body) as List<dynamic>)
          .map((item) => _AssessmentTrendPoint.fromJson(item as Map<String, dynamic>))
          .toList();

      final counts = <String, int>{};
      for (final assessment in data) {
        counts[assessment.assessmentId] =
            (counts[assessment.assessmentId] ?? 0) + 1;
      }

      if (!mounted) return;
      setState(() {
        _assessments = data;
        _selectedAssessmentId = counts.isEmpty
            ? null
            : counts.entries.reduce((a, b) => a.value >= b.value ? a : b).key;
      });
    } catch (_) {
      setState(() => _error = 'Network error fetching trends.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF8FB9A8)),
      );
    }
    if (_error != null) {
      return Center(
        child: Text(_error!, style: const TextStyle(color: Colors.red)),
      );
    }

    final assessmentIds = _assessments
        .map((assessment) => assessment.assessmentId)
        .toSet()
        .toList()
      ..sort();
    final filteredData = _assessments
        .where((assessment) => assessment.assessmentId == _selectedAssessmentId)
        .toList()
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Longitudinal Severity',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (assessmentIds.isNotEmpty && _selectedAssessmentId != null)
                DropdownButton<String>(
                  value: _selectedAssessmentId,
                  underline: const SizedBox(),
                  icon: const Icon(
                    Icons.keyboard_arrow_down,
                    color: Color(0xFF8FB9A8),
                  ),
                  style: GoogleFonts.inter(
                    color: const Color(0xFF8FB9A8),
                    fontWeight: FontWeight.bold,
                  ),
                  items: assessmentIds
                      .map(
                        (assessmentId) => DropdownMenuItem(
                          value: assessmentId,
                          child: Text(assessmentId.toUpperCase()),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _selectedAssessmentId = value);
                    }
                  },
                ),
            ],
          ),
          const SizedBox(height: 24),
          if (filteredData.isEmpty)
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Text('No assessments logged for this metric yet.'),
              ),
            )
          else
            _buildChart(filteredData),
          const SizedBox(height: 32),
          Text(
            'Assessment History',
            style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ...filteredData.reversed.map(_buildHistoryCard),
        ],
      ),
    );
  }

  Widget _buildHistoryCard(_AssessmentTrendPoint assessment) {
    final date = assessment.createdAt.toLocal();
    final dateStr =
        "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF8FB9A8).withValues(alpha: 0.1),
          child: Text(
            assessment.rawScore.toString(),
            style: const TextStyle(
              color: Color(0xFF8FB9A8),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          assessment.severity,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('${assessment.interpretation} • $dateStr'),
      ),
    );
  }

  Widget _buildChart(List<_AssessmentTrendPoint> data) {
    if (data.length < 2) {
      return Container(
        height: 200,
        alignment: Alignment.center,
        child: const Text(
          'Not enough data points to plot a trend line. Check back after the next assessment.',
        ),
      );
    }

    final spots = <FlSpot>[];
    double maxScore = 0;
    for (var index = 0; index < data.length; index++) {
      final score = data[index].rawScore.toDouble();
      if (score > maxScore) maxScore = score;
      spots.add(FlSpot(index.toDouble(), score));
    }

    return Container(
      height: 250,
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: LineChart(
        LineChartData(
          gridData: const FlGridData(show: false),
          titlesData: FlTitlesData(
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index >= 0 && index < data.length) {
                    final date = data[index].createdAt.toLocal();
                    return Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        '${date.month}/${date.day}',
                        style: const TextStyle(fontSize: 10, color: Colors.grey),
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ),
          ),
          borderData: FlBorderData(show: false),
          minX: 0,
          maxX: (data.length - 1).toDouble(),
          minY: 0,
          maxY: maxScore == 0 ? 5 : maxScore + (maxScore * 0.2),
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

class _AssessmentTrendPoint {
  final String assessmentId;
  final int rawScore;
  final String severity;
  final String interpretation;
  final DateTime createdAt;

  const _AssessmentTrendPoint({
    required this.assessmentId,
    required this.rawScore,
    required this.severity,
    required this.interpretation,
    required this.createdAt,
  });

  factory _AssessmentTrendPoint.fromJson(Map<String, dynamic> json) {
    return _AssessmentTrendPoint(
      assessmentId: json['assessment_id'] as String? ?? 'unknown',
      rawScore: json['raw_score'] as int? ?? 0,
      severity: json['severity'] as String? ?? 'Scored',
      interpretation:
          json['interpretation'] as String? ?? 'Assessment completed.',
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}
