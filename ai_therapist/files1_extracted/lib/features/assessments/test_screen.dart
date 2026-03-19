import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'assessment_service.dart';

class AssessmentScreen extends StatefulWidget {
  final String assessmentId;
  final String title;
  final List<String> questions;
  final List<String> options;

  const AssessmentScreen({
    super.key,
    required this.assessmentId,
    required this.title,
    required this.questions,
    required this.options,
  });

  @override
  State<AssessmentScreen> createState() => _AssessmentScreenState();
}

class _AssessmentScreenState extends State<AssessmentScreen> {
  final Map<int, int> _answers = {};
  int _currentStep = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title, style: GoogleFonts.outfit()),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (_currentStep + 1) / widget.questions.length,
            backgroundColor: Colors.grey.shade200,
            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF8FB9A8)),
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Question ${_currentStep + 1} of ${widget.questions.length}',
                    style: const TextStyle(
                        color: Color(0xFF8FB9A8), fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    widget.questions[_currentStep],
                    style: GoogleFonts.outfit(
                        fontSize: 22, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 40),
                  ...List.generate(widget.options.length, (index) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _answers[_currentStep] = index;
                          });
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: _answers[_currentStep] == index
                                  ? const Color(0xFF8FB9A8)
                                  : Colors.grey.shade300,
                              width: 2,
                            ),
                            borderRadius: BorderRadius.circular(16),
                            color: _answers[_currentStep] == index
                                ? const Color(0xFF8FB9A8).withOpacity(0.05)
                                : Colors.transparent,
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                  child: Text(widget.options[index],
                                      style: const TextStyle(fontSize: 16))),
                              if (_answers[_currentStep] == index)
                                const Icon(Icons.check_circle,
                                    color: Color(0xFF8FB9A8)),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ),
          _buildNavigation(),
        ],
      ),
    );
  }

  Widget _buildNavigation() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -5))
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          if (_currentStep > 0)
            TextButton(
              onPressed: () => setState(() => _currentStep--),
              child: const Text('Back'),
            )
          else
            const SizedBox(),
          ElevatedButton(
            onPressed: _answers.containsKey(_currentStep)
                ? () {
                    if (_currentStep < widget.questions.length - 1) {
                      setState(() => _currentStep++);
                    } else {
                      _showResults();
                    }
                  }
                : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8FB9A8),
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
              foregroundColor: Colors.white,
            ),
            child: Text(
                _currentStep < widget.questions.length - 1 ? 'Next' : 'Finish'),
          ),
        ],
      ),
    );
  }

  void _showResults() async {
    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      // Calculate score
      final result =
          AssessmentService.calculateScore(widget.assessmentId, _answers);

      // Save result
      await AssessmentService.saveResult(result);

      // Close loading
      if (mounted) Navigator.pop(context);

      // Show Result Dialog
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Assessment Complete'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Score: ${result.rawScore}',
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF00695C))),
                const SizedBox(height: 16),
                Text('Severity: ${result.severity}',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Interpretation: ${result.interpretation}'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () =>
                    Navigator.of(context).popUntil((route) => route.isFirst),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      // Close loading if error
      if (mounted) Navigator.pop(context);

      // Show error
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving results: $e')),
        );
      }
    }
  }
}
