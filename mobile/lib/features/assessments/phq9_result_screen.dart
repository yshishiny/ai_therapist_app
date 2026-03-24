import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'phq9_service.dart';

class Phq9ResultScreen extends StatefulWidget {
  final Phq9Result result;
  final String? patientName;

  const Phq9ResultScreen({
    super.key,
    required this.result,
    this.patientName,
  });

  @override
  State<Phq9ResultScreen> createState() => _Phq9ResultScreenState();
}

class _Phq9ResultScreenState extends State<Phq9ResultScreen>
    with TickerProviderStateMixin {
  late AnimationController _gaugeController;
  late AnimationController _cardsController;
  late Animation<double> _gaugeAnim;
  late Animation<double> _scoreCountAnim;

  @override
  void initState() {
    super.initState();

    _gaugeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _cardsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _gaugeAnim = CurvedAnimation(
      parent: _gaugeController,
      curve: Curves.easeOutCubic,
    );
    _scoreCountAnim = Tween<double>(
      begin: 0,
      end: widget.result.totalScore.toDouble(),
    ).animate(CurvedAnimation(
      parent: _gaugeController,
      curve: Curves.easeOutCubic,
    ));

    // Stagger: gauge animates, then cards fade in
    _gaugeController.forward().then((_) => _cardsController.forward());

    // Haptic feedback on severe results
    final sev = widget.result.severity;
    if (sev == Phq9Severity.severe ||
        sev == Phq9Severity.moderatelySevere ||
        widget.result.hasSuicidalIdeation) {
      HapticFeedback.mediumImpact();
    }
  }

  @override
  void dispose() {
    _gaugeController.dispose();
    _cardsController.dispose();
    super.dispose();
  }

  Color get _severityColor =>
      Color(widget.result.severity.colorValue);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F8),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Text('PHQ-9 Results',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        actions: [
          TextButton.icon(
            onPressed: _shareResult,
            icon: const Icon(Icons.share_outlined, size: 18),
            label: const Text('Share'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Hero: gauge + score ──────────────────────────────────
            _buildScoreHero(),

            const SizedBox(height: 16),

            // ── Suicidality alert (shows only if Q9 > 0) ─────────────
            if (widget.result.hasSuicidalIdeation) ...[
              _buildSuicidalityAlert(),
              const SizedBox(height: 16),
            ],

            // ── Clinical interpretation ───────────────────────────────
            _buildFadeInCard(
              delay: 0.0,
              child: _buildInterpretationCard(),
            ),

            const SizedBox(height: 12),

            // ── Recommended actions ───────────────────────────────────
            _buildFadeInCard(
              delay: 0.15,
              child: _buildRecommendationsCard(),
            ),

            const SizedBox(height: 12),

            // ── Per-item breakdown ────────────────────────────────────
            _buildFadeInCard(
              delay: 0.3,
              child: _buildItemBreakdownCard(),
            ),

            // ── Functional impairment (if answered) ───────────────────
            if (widget.result.functionalImpairment != null) ...[
              const SizedBox(height: 12),
              _buildFadeInCard(
                delay: 0.4,
                child: _buildFunctionalCard(),
              ),
            ],

            const SizedBox(height: 24),

            // ── Actions ──────────────────────────────────────────────
            _buildFadeInCard(
              delay: 0.5,
              child: _buildActionButtons(context),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  // ─── Hero score card ────────────────────────────────────────────────────────

  Widget _buildScoreHero() {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        children: [
          // Patient + date
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (widget.patientName != null)
                Text(
                  widget.patientName!,
                  style: GoogleFonts.inter(
                      fontWeight: FontWeight.w600,
                      color: Colors.black87),
                ),
              Text(
                _formatDate(widget.result.timestamp),
                style: const TextStyle(
                    fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // Gauge
          AnimatedBuilder(
            animation: _gaugeAnim,
            builder: (_, __) => _Gauge(
              progress: _gaugeAnim.value * widget.result.scoreRatio,
              score: _scoreCountAnim.value.round(),
              severity: widget.result.severity,
              color: _severityColor,
            ),
          ),

          const SizedBox(height: 24),

          // Severity band strip
          _SeverityStrip(currentSeverity: widget.result.severity),
        ],
      ),
    );
  }

  // ─── Suicidality alert ──────────────────────────────────────────────────────

  Widget _buildSuicidalityAlert() {
    final q9Score = widget.result.suicidalIdeationScore;
    final q9Label = phq9Options[q9Score];

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.red.shade300, width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.warning_amber_rounded,
                    color: Colors.red.shade700, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Suicidal Ideation Endorsed',
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.red.shade800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Item 9 (suicidal ideation) was answered '
            '"$q9Label" (score $q9Score/3). '
            'A structured suicide risk assessment is required '
            'before the patient leaves the session.',
            style: TextStyle(
                fontSize: 13,
                color: Colors.red.shade900,
                height: 1.6),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _AlertActionChip(
                label: 'Columbia Protocol (C-SSRS)',
                icon: Icons.checklist_outlined,
                color: Colors.red.shade600,
              ),
              _AlertActionChip(
                label: 'Document safety plan',
                icon: Icons.edit_outlined,
                color: Colors.red.shade600,
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Interpretation card ────────────────────────────────────────────────────

  Widget _buildInterpretationCard() {
    final sev = widget.result.severity;
    return _SectionCard(
      icon: Icons.psychology_outlined,
      iconColor: _severityColor,
      title: 'Clinical Interpretation',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Severity badge
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: _severityColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${sev.label} Depression',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: _severityColor,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Score range: ${sev.range}',
                style: const TextStyle(
                    fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            sev.clinicalInterpretation,
            style: const TextStyle(
                fontSize: 14, color: Colors.black87, height: 1.7),
          ),
          const SizedBox(height: 12),
          // Symptom count callout
          _StatRow(
            label: 'Symptoms at clinically relevant frequency (≥ 2)',
            value: '${widget.result.symptomCount} / 9',
            valueColor: widget.result.symptomCount >= 5
                ? Colors.orange
                : Colors.grey.shade700,
          ),
          _StatRow(
            label: 'Total score',
            value: '${widget.result.totalScore} / 27',
            valueColor: _severityColor,
          ),
        ],
      ),
    );
  }

  // ─── Recommendations card ───────────────────────────────────────────────────

  Widget _buildRecommendationsCard() {
    final actions = widget.result.severity.recommendedActions;
    return _SectionCard(
      icon: Icons.playlist_add_check_outlined,
      iconColor: const Color(0xFF6C63FF),
      title: 'Recommended Actions',
      child: Column(
        children: actions.asMap().entries.map((e) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 22,
                  height: 22,
                  margin: const EdgeInsets.only(top: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6C63FF).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '${e.key + 1}',
                      style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF6C63FF)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    e.value,
                    style: const TextStyle(
                        fontSize: 13, height: 1.6, color: Colors.black87),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ─── Per-item breakdown ─────────────────────────────────────────────────────

  Widget _buildItemBreakdownCard() {
    return _SectionCard(
      icon: Icons.bar_chart_outlined,
      iconColor: Colors.teal,
      title: 'Item-by-Item Breakdown',
      child: Column(
        children: List.generate(_phq9Count, (i) {
          final score = widget.result.answers[i] ?? 0;
          final domain = phq9Domains[i];
          final isSuicidality = i == 8;
          return _ItemRow(
            index: i,
            domain: domain,
            score: score,
            isSuicidality: isSuicidality,
          );
        }),
      ),
    );
  }

  static const int _phq9Count = 9;

  // ─── Functional impairment card ─────────────────────────────────────────────

  Widget _buildFunctionalCard() {
    final fi = widget.result.functionalImpairment!;
    final label = phq9FunctionalOptions[fi];
    final colors = [Colors.green, Colors.amber, Colors.orange, Colors.red];

    return _SectionCard(
      icon: Icons.accessibility_new_outlined,
      iconColor: colors[fi],
      title: 'Functional Impairment',
      child: Row(
        children: [
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: colors[fi].withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: colors[fi].withValues(alpha: 0.4)),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: colors[fi],
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Action buttons ─────────────────────────────────────────────────────────

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => Navigator.popUntil(
                context, (r) => r.isFirst),
            icon: const Icon(Icons.home_outlined),
            label: const Text('Dashboard'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
              side: BorderSide(color: Colors.grey.shade300),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.refresh),
            label: const Text('Retake'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8FB9A8),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(50),
              elevation: 0,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
        ),
      ],
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  Widget _buildFadeInCard({required double delay, required Widget child}) {
    return AnimatedBuilder(
      animation: _cardsController,
      builder: (_, __) {
        final t = ((_cardsController.value - delay) / (1.0 - delay))
            .clamp(0.0, 1.0);
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, 16 * (1 - t)),
            child: child,
          ),
        );
      },
    );
  }

  void _shareResult() {
    final sev = widget.result.severity;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'PHQ-9: ${widget.result.totalScore}/27 — ${sev.label} Depression',
        ),
        action: SnackBarAction(label: 'Copy', onPressed: () {}),
      ),
    );
  }

  String _formatDate(DateTime dt) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }
}

// ─── Gauge widget ─────────────────────────────────────────────────────────────

class _Gauge extends StatelessWidget {
  final double progress;  // 0.0–1.0
  final int score;
  final Phq9Severity severity;
  final Color color;

  const _Gauge({
    required this.progress,
    required this.score,
    required this.severity,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 200,
      height: 200,
      child: CustomPaint(
        painter: _GaugePainter(progress: progress, color: color),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                '$score',
                style: GoogleFonts.inter(
                  fontSize: 56,
                  fontWeight: FontWeight.bold,
                  color: color,
                  height: 1.0,
                ),
              ),
              const Text(
                'out of 27',
                style: TextStyle(
                    fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 6),
              Text(
                severity.label,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  final double progress;
  final Color color;

  _GaugePainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 12;
    const startAngle = math.pi * 0.75;
    const sweepAngle = math.pi * 1.5;

    // Background arc
    final bgPaint = Paint()
      ..color = Colors.grey.shade100
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      bgPaint,
    );

    // Severity zone ticks (subtle)
    final tickPaint = Paint()
      ..color = Colors.grey.shade300
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final thresholds = [4 / 27, 9 / 27, 14 / 27, 19 / 27];
    for (final t in thresholds) {
      final angle = startAngle + sweepAngle * t;
      final inner = center +
          Offset(math.cos(angle), math.sin(angle)) * (radius - 14);
      final outer =
          center + Offset(math.cos(angle), math.sin(angle)) * (radius + 2);
      canvas.drawLine(inner, outer, tickPaint);
    }

    // Filled arc
    if (progress > 0) {
      final fgPaint = Paint()
        ..shader = SweepGradient(
          startAngle: startAngle,
          endAngle: startAngle + sweepAngle * progress,
          colors: [
            const Color(0xFF4CAF50),
            const Color(0xFFFFC107),
            const Color(0xFFFF9800),
            color,
          ],
          stops: const [0.0, 0.35, 0.6, 1.0],
        ).createShader(Rect.fromCircle(center: center, radius: radius))
        ..style = PaintingStyle.stroke
        ..strokeWidth = 14
        ..strokeCap = StrokeCap.round;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle * progress,
        false,
        fgPaint,
      );
    }
  }

  @override
  bool shouldRepaint(_GaugePainter old) =>
      old.progress != progress || old.color != color;
}

// ─── Severity strip ───────────────────────────────────────────────────────────

class _SeverityStrip extends StatelessWidget {
  final Phq9Severity currentSeverity;
  static const _bands = Phq9Severity.values;

  const _SeverityStrip({required this.currentSeverity});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Severity bands',
            style: TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 8),
        Row(
          children: _bands.map((band) {
            final isActive = band == currentSeverity;
            final color = Color(band.colorValue);
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Column(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 400),
                      height: isActive ? 10 : 6,
                      decoration: BoxDecoration(
                        color: isActive
                            ? color
                            : color.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      band.label.split(' ').first,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: isActive
                            ? FontWeight.bold
                            : FontWeight.normal,
                        color: isActive ? color : Colors.grey,
                      ),
                    ),
                    Text(
                      band.range,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                          fontSize: 8, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}

// ─── Item row in breakdown ────────────────────────────────────────────────────

class _ItemRow extends StatelessWidget {
  final int index;
  final String domain;
  final int score;
  final bool isSuicidality;

  const _ItemRow({
    required this.index,
    required this.domain,
    required this.score,
    required this.isSuicidality,
  });

  Color get _scoreColor {
    if (isSuicidality && score > 0) return Colors.red.shade500;
    switch (score) {
      case 0: return Colors.green;
      case 1: return const Color(0xFFFFC107);
      case 2: return Colors.orange;
      case 3: return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          // Index
          SizedBox(
            width: 22,
            child: Text(
              '${index + 1}.',
              style: const TextStyle(
                  fontSize: 12, color: Colors.grey),
            ),
          ),
          // Domain label
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      domain,
                      style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Colors.black87),
                    ),
                    if (isSuicidality) ...[
                      const SizedBox(width: 6),
                      Icon(Icons.shield_outlined,
                          size: 12,
                          color: score > 0
                              ? Colors.red
                              : Colors.grey.shade400),
                    ],
                  ],
                ),
                // Progress bar
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: score / 3.0,
                    minHeight: 4,
                    backgroundColor: Colors.grey.shade100,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(_scoreColor),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // Score chip
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: _scoreColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$score',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: _scoreColor,
                ),
              ),
            ),
          ),
          // Option label
          const SizedBox(width: 8),
          SizedBox(
            width: 90,
            child: Text(
              phq9Options[score],
              style: TextStyle(
                  fontSize: 11,
                  color: _scoreColor,
                  fontWeight: score > 0
                      ? FontWeight.w600
                      : FontWeight.normal),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Shared section card ──────────────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final Widget child;

  const _SectionCard({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

class _StatRow extends StatelessWidget {
  final String label;
  final String value;
  final Color valueColor;

  const _StatRow({
    required this.label,
    required this.value,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 12, color: Colors.grey)),
          Text(value,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: valueColor)),
        ],
      ),
    );
  }
}

// ─── Alert action chip ────────────────────────────────────────────────────────

class _AlertActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;

  const _AlertActionChip({
    required this.label,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.5)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Text(label,
                style: TextStyle(
                    fontSize: 12,
                    color: color,
                    fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
