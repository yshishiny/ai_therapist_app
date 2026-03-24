import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'phq9_service.dart';
import 'phq9_result_screen.dart';

class Phq9Screen extends StatefulWidget {
  /// Pass a patientId to attach results to a patient record
  final String? patientId;
  final String? patientName;

  const Phq9Screen({super.key, this.patientId, this.patientName});

  @override
  State<Phq9Screen> createState() => _Phq9ScreenState();
}

class _Phq9ScreenState extends State<Phq9Screen>
    with SingleTickerProviderStateMixin {
  final Map<int, int> _answers = {};
  int _currentStep = 0; // 0–8 = PHQ-9 items; 9 = functional impairment
  int? _functionalAnswer;
  bool _isSaving = false;

  // total steps = 9 questions + 1 functional = 10
  static const int _phq9Count = 9;
  static const int _totalSteps = 10;

  late final AnimationController _slideController;
  late Animation<Offset> _slideIn;
  late Animation<double> _fadeIn;

  @override
  void initState() {
    super.initState();
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );
    _buildAnimations(forward: true);
    _slideController.forward();
  }

  @override
  void dispose() {
    _slideController.dispose();
    super.dispose();
  }

  void _buildAnimations({required bool forward}) {
    _slideIn = Tween<Offset>(
      begin: Offset(forward ? 0.18 : -0.18, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeOutCubic,
    ));
    _fadeIn = CurvedAnimation(
      parent: _slideController,
      curve: Curves.easeIn,
    );
  }

  Future<void> _animateTo(int nextStep, {required bool forward}) async {
    _buildAnimations(forward: forward);
    _slideController.reset();
    setState(() => _currentStep = nextStep);
    await _slideController.forward();
  }

  void _onNext() {
    if (_currentStep < _phq9Count) {
      // Advance through PHQ-9 items
      if (!_answers.containsKey(_currentStep)) return;
      if (_currentStep == _phq9Count - 1) {
        // Last PHQ-9 item → go to functional impairment Q
        _animateTo(_phq9Count, forward: true);
      } else {
        _animateTo(_currentStep + 1, forward: true);
      }
    } else {
      // Functional step → submit
      _submit();
    }
  }

  void _onBack() {
    if (_currentStep == 0) return;
    _animateTo(_currentStep - 1, forward: false);
  }

  Future<void> _submit() async {
    // Require all 9 PHQ-9 answers
    if (_answers.length < _phq9Count) return;

    setState(() => _isSaving = true);
    final result = Phq9Service.score(
      _answers,
      functionalImpairment: _functionalAnswer,
      patientId: widget.patientId,
    );
    await Phq9Service.saveResult(result);

    if (!mounted) return;
    setState(() => _isSaving = false);

    await Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => Phq9ResultScreen(
          result: result,
          patientName: widget.patientName,
        ),
        transitionsBuilder: (_, anim, __, child) => FadeTransition(
          opacity: anim,
          child: child,
        ),
        transitionDuration: const Duration(milliseconds: 400),
      ),
    );
  }

  bool get _canAdvance {
    if (_currentStep < _phq9Count) {
      return _answers.containsKey(_currentStep);
    }
    // Functional question is optional — can always advance
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final isPhq9Step = _currentStep < _phq9Count;
    final progress = (_currentStep + (_answers.containsKey(_currentStep) ? 1 : 0)) /
        _totalSteps;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7F8),
      appBar: _buildAppBar(isPhq9Step),
      body: Stack(
        children: [
          Column(
            children: [
              _buildProgressBar(progress),
              if (isPhq9Step) _buildStepHeader(),
              Expanded(
                child: SlideTransition(
                  position: _slideIn,
                  child: FadeTransition(
                    opacity: _fadeIn,
                    child: isPhq9Step
                        ? _buildQuestionCard()
                        : _buildFunctionalCard(),
                  ),
                ),
              ),
              _buildNavigationBar(),
            ],
          ),

          // Saving overlay
          if (_isSaving)
            Container(
              color: Colors.black.withValues(alpha: 0.35),
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(bool isPhq9Step) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.close, color: Colors.black87),
        onPressed: () => _confirmExit(),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'PHQ-9',
            style: GoogleFonts.inter(
                fontWeight: FontWeight.bold,
                fontSize: 17,
                color: Colors.black87),
          ),
          Text(
            widget.patientName != null
                ? widget.patientName!
                : 'Depression Severity',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
      titleSpacing: 0,
    );
  }

  Widget _buildProgressBar(double progress) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _currentStep < _phq9Count
                    ? '${_currentStep + 1} of $_phq9Count'
                    : 'Final question',
                style:
                    const TextStyle(fontSize: 11, color: Colors.grey),
              ),
              Text(
                '${(_answers.length / _phq9Count * 100).round()}% complete',
                style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF8FB9A8),
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 5,
              backgroundColor: Colors.grey.shade100,
              valueColor: const AlwaysStoppedAnimation<Color>(
                  Color(0xFF8FB9A8)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepHeader() {
    final domain = phq9Domains[_currentStep];
    // Item 9 is the suicidality item — flag it visually
    final isSuicidalityItem = _currentStep == 8;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: isSuicidalityItem
                  ? Colors.red.shade50
                  : const Color(0xFF8FB9A8).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isSuicidalityItem
                    ? Colors.red.shade200
                    : const Color(0xFF8FB9A8).withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isSuicidalityItem) ...[
                  Icon(Icons.shield_outlined,
                      size: 13, color: Colors.red.shade600),
                  const SizedBox(width: 4),
                ],
                Text(
                  domain,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isSuicidalityItem
                        ? Colors.red.shade700
                        : const Color(0xFF00695C),
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionCard() {
    final questionText = phq9Questions[_currentStep];
    final isSuicidalityItem = _currentStep == 8;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question text
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: Colors.grey.shade100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Over the last 2 weeks, how often have you been bothered by…',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade500,
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  questionText,
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    height: 1.45,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),

          // Suicidality safety callout (item 9 only)
          if (isSuicidalityItem) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline,
                      color: Colors.red.shade600, size: 18),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'If the patient endorses any frequency on this item, '
                      'a structured suicide risk assessment should be '
                      'conducted before concluding the session.',
                      style: TextStyle(
                          fontSize: 12,
                          color: Colors.red.shade800,
                          height: 1.5),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),

          // Answer options
          ...List.generate(phq9Options.length, (optionIdx) {
            final isSelected = _answers[_currentStep] == optionIdx;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _OptionTile(
                score: optionIdx,
                label: phq9Options[optionIdx],
                isSelected: isSelected,
                isSuicidalityItem: isSuicidalityItem,
                onTap: () {
                  setState(() => _answers[_currentStep] = optionIdx);
                  // Auto-advance after a brief delay
                  Future.delayed(const Duration(milliseconds: 280), () {
                    if (mounted && _answers.containsKey(_currentStep)) {
                      _onNext();
                    }
                  });
                },
              ),
            );
          }),

          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildFunctionalCard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF8FB9A8).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Functional impairment',
                    style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF00695C),
                        fontWeight: FontWeight.w600),
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  phq9FunctionalQuestion,
                  style: GoogleFonts.inter(
                    fontSize: 19,
                    fontWeight: FontWeight.w600,
                    height: 1.5,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'This question is optional and does not affect the PHQ-9 score.',
                  style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade400,
                      fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ...List.generate(phq9FunctionalOptions.length, (idx) {
            final isSelected = _functionalAnswer == idx;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _OptionTile(
                score: idx,
                label: phq9FunctionalOptions[idx],
                isSelected: isSelected,
                isSuicidalityItem: false,
                onTap: () =>
                    setState(() => _functionalAnswer = idx),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildNavigationBar() {
    final isFirstStep = _currentStep == 0;
    final isFunctionalStep = _currentStep == _phq9Count;
    final buttonLabel = isFunctionalStep ? 'Submit' : 'Next';

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Row(
        children: [
          if (!isFirstStep)
            Expanded(
              flex: 1,
              child: OutlinedButton(
                onPressed: _onBack,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  side: BorderSide(color: Colors.grey.shade300),
                ),
                child: const Text('Back',
                    style: TextStyle(color: Colors.black54)),
              ),
            ),
          if (!isFirstStep) const SizedBox(width: 12),
          Expanded(
            flex: 3,
            child: AnimatedOpacity(
              opacity: _canAdvance ? 1.0 : 0.45,
              duration: const Duration(milliseconds: 200),
              child: ElevatedButton(
                onPressed: _canAdvance ? _onNext : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: isFunctionalStep
                      ? const Color(0xFF6C63FF)
                      : const Color(0xFF8FB9A8),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(50),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      buttonLabel,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    if (!isFunctionalStep) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.arrow_forward, size: 18),
                    ],
                    if (isFunctionalStep) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.check, size: 18),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmExit() async {
    if (_answers.isEmpty) {
      Navigator.pop(context);
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20)),
        title: Text('Abandon assessment?',
            style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: const Text(
          'Your progress will not be saved. '
          'Are you sure you want to exit?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep going'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade400,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) Navigator.pop(context);
  }
}

// ─── Reusable option tile ─────────────────────────────────────────────────────

class _OptionTile extends StatelessWidget {
  final int score;       // 0–3
  final String label;
  final bool isSelected;
  final bool isSuicidalityItem;
  final VoidCallback onTap;

  const _OptionTile({
    required this.score,
    required this.label,
    required this.isSelected,
    required this.isSuicidalityItem,
    required this.onTap,
  });

  Color get _accentColor {
    if (isSuicidalityItem && score > 0) {
      // For suicidality item, non-zero answers use a red accent to signal risk
      return Colors.red.shade400;
    }
    // Standard 0→3 gradient: green → amber → orange → red
    switch (score) {
      case 0: return const Color(0xFF4CAF50);
      case 1: return const Color(0xFFFFC107);
      case 2: return const Color(0xFFFF9800);
      case 3: return const Color(0xFFF44336);
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      decoration: BoxDecoration(
        color: isSelected
            ? _accentColor.withValues(alpha: 0.08)
            : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isSelected ? _accentColor : Colors.grey.shade200,
          width: isSelected ? 2 : 1,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: _accentColor.withValues(alpha: 0.15),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                )
              ]
            : [],
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(
              horizontal: 18, vertical: 16),
          child: Row(
            children: [
              // Score dot
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected
                      ? _accentColor
                      : Colors.grey.shade100,
                ),
                child: Center(
                  child: Text(
                    '$score',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected
                          ? Colors.white
                          : Colors.grey.shade500,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: isSelected
                        ? FontWeight.w600
                        : FontWeight.normal,
                    color: isSelected
                        ? Colors.black87
                        : Colors.black54,
                  ),
                ),
              ),
              if (isSelected)
                Icon(Icons.check_circle_rounded,
                    color: _accentColor, size: 22),
            ],
          ),
        ),
      ),
    );
  }
}
