import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_client.dart';

/// Patient Home Tab — Daily mood check-in + next session card + affirmation
class PatientHomeTab extends StatefulWidget {
  const PatientHomeTab({super.key});

  @override
  State<PatientHomeTab> createState() => _PatientHomeTabState();
}

class _PatientHomeTabState extends State<PatientHomeTab> {
  int? _selectedMood;    // 1–5
  double _energyLevel = 3;
  bool _submitting = false;
  bool _todayLogged = false;
  Map<String, dynamic>? _profile;
  List<dynamic> _sessions = [];

  static const _moodEmojis = ['😔', '😟', '😐', '🙂', '😊'];
  static const _moodLabels = ['Very Low', 'Low', 'Okay', 'Good', 'Great'];
  static const _affirmations = [
    'You are stronger than you think.',
    'Every small step forward matters.',
    'It\'s okay to ask for help.',
    'You are worthy of healing and peace.',
    'Progress, not perfection.',
    'Today you showed up. That\'s enough.',
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final profileResp = await ApiClient.instance.get('/me/profile');
      final sessionsResp = await ApiClient.instance.get('/me/sessions?upcoming_only=true');
      if (mounted) {
        setState(() {
          if (profileResp.statusCode == 200) _profile = jsonDecode(profileResp.body);
          if (sessionsResp.statusCode == 200) _sessions = jsonDecode(sessionsResp.body);
        });
      }
    } catch (_) {}
  }

  Future<void> _submitMood() async {
    if (_selectedMood == null) return;
    setState(() => _submitting = true);
    try {
      final resp = await ApiClient.instance.post(
        '/me/mood',
        body: {
          'mood_score': _selectedMood,
          'energy_score': _energyLevel.round(),
          'note': null,
          'emotions': [],
        },
      );
      if (resp.statusCode == 201 && mounted) {
        setState(() => _todayLogged = true);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Check-in saved! 💚'),
          backgroundColor: Color(0xFF8FB9A8),
        ));
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = (_profile?['full_name'] as String?)?.split(' ').first ?? '';
    final affirmation = _affirmations[DateTime.now().day % _affirmations.length];
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FA),
      body: CustomScrollView(
        slivers: [
          // ── Gradient Header ──
          SliverToBoxAdapter(
            child: Container(
              padding: EdgeInsets.fromLTRB(24, MediaQuery.of(context).padding.top + 20, 24, 32),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF8FB9A8), Color(0xFF6FA090)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('$greeting${name.isNotEmpty ? ', $name' : ''}!',
                      style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text(affirmation, style: GoogleFonts.inter(fontSize: 13, color: Colors.white.withValues(alpha: 0.9))),
                ],
              ),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: SliverList(
              delegate: SliverChildListDelegate([

                // ── Today's Check-in ──
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))],
                  ),
                  child: _todayLogged
                      ? Column(
                          children: [
                            const Icon(Icons.check_circle_rounded, color: Color(0xFF8FB9A8), size: 48),
                            const SizedBox(height: 12),
                            Text("Today's check-in logged!", style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
                            Text("See your mood history in Progress.", style: GoogleFonts.inter(color: Colors.grey)),
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("How are you feeling today?",
                                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 20),

                            // Mood emoji row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: List.generate(5, (i) {
                                final isSelected = _selectedMood == i + 1;
                                return GestureDetector(
                                  onTap: () => setState(() => _selectedMood = i + 1),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: isSelected ? const Color(0xFF8FB9A8).withValues(alpha: 0.15) : Colors.transparent,
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(color: isSelected ? const Color(0xFF8FB9A8) : Colors.transparent, width: 2),
                                    ),
                                    child: Column(
                                      children: [
                                        Text(_moodEmojis[i], style: const TextStyle(fontSize: 28)),
                                        const SizedBox(height: 4),
                                        Text(_moodLabels[i],
                                            style: TextStyle(fontSize: 10, color: isSelected ? const Color(0xFF8FB9A8) : Colors.grey, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                                      ],
                                    ),
                                  ),
                                );
                              }),
                            ),
                            const SizedBox(height: 24),

                            // Energy slider
                            Text('Energy level: ${_energyLevel.round()}/5',
                                style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13)),
                            Slider(
                              value: _energyLevel,
                              min: 1, max: 5, divisions: 4,
                              activeColor: const Color(0xFF8FB9A8),
                              label: _energyLevel.round().toString(),
                              onChanged: (v) => setState(() => _energyLevel = v),
                            ),
                            const SizedBox(height: 16),

                            SizedBox(
                              width: double.infinity,
                              height: 50,
                              child: ElevatedButton(
                                onPressed: _selectedMood == null || _submitting ? null : _submitMood,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF8FB9A8),
                                  foregroundColor: Colors.white,
                                  disabledBackgroundColor: Colors.grey.shade200,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  elevation: 0,
                                ),
                                child: _submitting
                                    ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                                    : Text('Log Check-in', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16)),
                              ),
                            ),
                          ],
                        ),
                ),

                const SizedBox(height: 20),

                // ── Upcoming Session Card ──
                Text('Next Session', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                _sessions.isEmpty
                    ? Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white, borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Center(child: Text('No upcoming sessions.', style: GoogleFonts.inter(color: Colors.grey))),
                      )
                    : Builder(builder: (_) {
                        final s = _sessions.first;
                        final dt = DateTime.tryParse(s['scheduled_at'] ?? '');
                        final label = dt != null
                            ? '${dt.day}/${dt.month}/${dt.year} at ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}'
                            : 'Scheduled';
                        return Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(colors: [Color(0xFFE8F5F0), Color(0xFFF0F8F5)]),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFF8FB9A8).withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(color: const Color(0xFF8FB9A8).withValues(alpha: 0.2), shape: BoxShape.circle),
                                child: const Icon(Icons.videocam_outlined, color: Color(0xFF8FB9A8)),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(s['session_type'] ?? 'Session', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14)),
                                    Text(label, style: GoogleFonts.inter(color: Colors.grey, fontSize: 12)),
                                  ],
                                ),
                              ),
                              const Icon(Icons.chevron_right, color: Colors.grey),
                            ],
                          ),
                        );
                      }),

                const SizedBox(height: 20),

                // ── Quick Tools ──
                Text('Wellness Tools', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _WellnessTile(icon: Icons.air, label: 'Breathe', color: Colors.blue, onTap: () => _startBreathing()),
                    const SizedBox(width: 12),
                    _WellnessTile(icon: Icons.self_improvement, label: 'Meditate', color: Colors.purple, onTap: () {}),
                    const SizedBox(width: 12),
                    _WellnessTile(icon: Icons.edit_note, label: 'Journal', color: Colors.orange, onTap: () {}),
                  ],
                ),
                const SizedBox(height: 80),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  void _startBreathing() {
    showDialog(
      context: context,
      builder: (_) => const _BreathingDialog(),
    );
  }
}

class _WellnessTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _WellnessTile({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.2)),
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 8),
              Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: color, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}

class _BreathingDialog extends StatefulWidget {
  const _BreathingDialog();
  @override State<_BreathingDialog> createState() => _BreathingDialogState();
}
class _BreathingDialogState extends State<_BreathingDialog> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;
  String _phase = 'Breathe In...';

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 4))
      ..addStatusListener((s) {
        if (s == AnimationStatus.completed) {
          setState(() => _phase = 'Breathe Out...');
          _ctrl.reverse();
        } else if (s == AnimationStatus.dismissed) {
          setState(() => _phase = 'Breathe In...');
          _ctrl.forward();
        }
      })
      ..forward();
    _anim = Tween<double>(begin: 80, end: 130).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        height: 300,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF8FB9A8), Color(0xFF6FA090)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation: _anim,
              builder: (_, __) => Container(
                width: _anim.value, height: _anim.value,
                decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.2)),
                child: const Icon(Icons.air, color: Colors.white, size: 40),
              ),
            ),
            const SizedBox(height: 24),
            Text(_phase, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('4-4 breathing technique', style: TextStyle(color: Colors.white70, fontSize: 13)),
            const SizedBox(height: 24),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Done', style: TextStyle(color: Colors.white, fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
