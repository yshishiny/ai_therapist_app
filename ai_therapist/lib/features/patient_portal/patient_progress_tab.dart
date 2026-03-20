import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/api_client.dart';

class PatientProgressTab extends StatefulWidget {
  const PatientProgressTab({super.key});

  @override
  State<PatientProgressTab> createState() => _PatientProgressTabState();
}

class _PatientProgressTabState extends State<PatientProgressTab> {
  bool _loading = true;
  List<dynamic> _moods = [];
  List<dynamic> _assessments = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() => _loading = true);
    try {
      final moodResp = await ApiClient.instance.get('/me/mood?days=14');
      final assessResp = await ApiClient.instance.get('/me/assessments');
      if (mounted) {
        setState(() {
          if (moodResp.statusCode == 200) _moods = jsonDecode(moodResp.body);
          if (assessResp.statusCode == 200) _assessments = jsonDecode(assessResp.body);
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  int get _streak {
    if (_moods.isEmpty) return 0;
    int s = 1;
    final sorted = _moods.toList()
      ..sort((a, b) => DateTime.parse(b['logged_at']).compareTo(DateTime.parse(a['logged_at'])));
    DateTime prev = DateTime.parse(sorted.first['logged_at']);
    for (int i = 1; i < sorted.length; i++) {
      final curr = DateTime.parse(sorted[i]['logged_at']);
      if (prev.difference(curr).inDays == 1) { s++; prev = curr; }
      else break;
    }
    return s;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text('My Progress', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _fetch, color: Colors.grey)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF8FB9A8)))
          : RefreshIndicator(
              color: const Color(0xFF8FB9A8),
              onRefresh: _fetch,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // ── Streak Card ──
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF8FB9A8), Color(0xFF6FA090)]),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        const Text('🔥', style: TextStyle(fontSize: 36)),
                        const SizedBox(width: 16),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('$_streak-day streak', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                            Text('Keep logging daily!', style: GoogleFonts.inter(color: Colors.white.withValues(alpha: 0.85), fontSize: 13)),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── Mood Chart ──
                  Text('Mood Last 14 Days', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Container(
                    height: 200,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade100)),
                    child: _moods.length < 2
                        ? const Center(child: Text('Log more check-ins to see your mood trend here.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)))
                        : LineChart(_buildMoodChart()),
                  ),
                  const SizedBox(height: 24),

                  // ── Assessment Badges ──
                  Text('Assessments Completed', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _assessments.isEmpty
                      ? Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                          child: Center(child: Text('No assessments completed yet.', style: GoogleFonts.inter(color: Colors.grey))),
                        )
                      : Column(
                          children: _assessments.take(5).map((a) {
                            final score = a['score_total'];
                            final band = a['severity_band'] ?? 'Scored';
                            final date = DateTime.tryParse(a['taken_at'] ?? '');
                            final dateStr = date != null ? '${date.day}/${date.month}/${date.year}' : '';
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade100)),
                              child: Row(
                                children: [
                                  CircleAvatar(backgroundColor: const Color(0xFF8FB9A8).withValues(alpha: 0.1), child: Text('${score ?? '-'}', style: const TextStyle(color: Color(0xFF8FB9A8), fontWeight: FontWeight.bold))),
                                  const SizedBox(width: 12),
                                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    Text(a['template_id']?.toString().toUpperCase() ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    Text(band, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                  ])),
                                  Text(dateStr, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                  const SizedBox(height: 80),
                ],
              ),
            ),
    );
  }

  LineChartData _buildMoodChart() {
    final spots = <FlSpot>[];
    for (int i = 0; i < _moods.length; i++) {
      final score = (_moods[i]['mood_score'] as num?)?.toDouble() ?? 0;
      spots.add(FlSpot(i.toDouble(), score));
    }
    return LineChartData(
      gridData: const FlGridData(show: false),
      titlesData: FlTitlesData(
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, getTitlesWidget: (v, _) => Text(v.toInt().toString(), style: const TextStyle(fontSize: 10, color: Colors.grey)), reservedSize: 24)),
        bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 24, getTitlesWidget: (v, _) {
          final i = v.toInt();
          if (i < 0 || i >= _moods.length) return const Text('');
          final dt = DateTime.tryParse(_moods[i]['logged_at'] ?? '');
          return Text(dt != null ? '${dt.month}/${dt.day}' : '', style: const TextStyle(fontSize: 9, color: Colors.grey));
        })),
      ),
      borderData: FlBorderData(show: false),
      minX: 0, maxX: (_moods.length - 1).toDouble(), minY: 0, maxY: 5.5,
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: const Color(0xFF8FB9A8),
          barWidth: 3,
          dotData: const FlDotData(show: true),
          belowBarData: BarAreaData(show: true, color: const Color(0xFF8FB9A8).withValues(alpha: 0.1)),
        ),
      ],
    );
  }
}
