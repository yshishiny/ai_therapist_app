import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_client.dart';

class UniversalAssessmentScreen extends StatefulWidget {
  final String patientId;
  final String templateId;
  final String templateName;
  final String type; // e.g., 'SCREENING', 'SOMATIC', 'ART_THERAPY'
  final Map<String, dynamic> scoringRules;

  const UniversalAssessmentScreen({
    super.key,
    required this.patientId,
    required this.templateId,
    required this.templateName,
    required this.type,
    required this.scoringRules,
  });

  @override
  State<UniversalAssessmentScreen> createState() => _UniversalAssessmentScreenState();
}

class _UniversalAssessmentScreenState extends State<UniversalAssessmentScreen> {
  final Map<String, dynamic> _answers = {};
  bool _submitting = false;
  
  // -- LIKERT STATE --
  int _currentQuestionIndex = 0;
  int _totalLikertQuestions = 0;

  @override
  void initState() {
    super.initState();
    if (["SCREENING", "TRAUMA", "PERSONALITY"].contains(widget.type)) {
       _totalLikertQuestions = widget.scoringRules['items'] as int? ?? 10;
    }
  }

  Future<void> _submitAssessment() async {
    setState(() => _submitting = true);
    try {
       // Mock calculating the summary (Usually deferred to backend, but we capture raw here)
       int total = 0;
       if (_answers.isNotEmpty && widget.type != "ART_THERAPY") {
         for (var val in _answers.values) {
           if (val is num) total += val.toInt();
         }
       }

       final response = await ApiClient.instance.post(
          '/patients/${widget.patientId}/assessments',
          body: jsonEncode({
            "template_id": widget.templateId,
            "raw_answers": _answers,
            "score_total": total,
            "context": "CLINICAL_PORTAL",
            "flagged": total > (widget.scoringRules['max'] != null ? (widget.scoringRules['max'] * 0.7) : 999)
          }),
       );

       if (response.statusCode == 200) {
         if (mounted) {
           Navigator.of(context).pop(true);
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Assessment saved successfully.', style: TextStyle(color: Colors.white)), backgroundColor: Color(0xFF8FB9A8)));
         }
       } else {
         throw Exception('HTTP ${response.statusCode}');
       }
    } catch (e) {
       if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to submit: $e')));
    } finally {
       if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.templateName, style: GoogleFonts.inter()),
        elevation: 0,
        backgroundColor: Colors.white,
      ),
      body: _buildDynamicBody(),
      bottomNavigationBar: _buildBottomBar(),
    );
  }

  Widget _buildDynamicBody() {
    // Determine the UI Strategy pattern based on the Template Type
    if (["SCREENING", "TRAUMA", "PERSONALITY"].contains(widget.type)) {
       return _buildLikertEngine();
    } else if (widget.type == "SOMATIC" || widget.type == "BODY_MAP") {
       return _buildSomaticBodyMap();
    } else if (widget.type == "ART_THERAPY") {
       return _buildArtTherapyUploader();
    }
    
    return const Center(child: Text("Unsupported Assessment Template"));
  }

  // --------------------------------------------------------------------------
  // 1. STANDARD LIKERT / PSYCHOMETRIC ENGINE (PHQ-9, GAD-7, PCL-5, PID-5)
  // --------------------------------------------------------------------------
  Widget _buildLikertEngine() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            LinearProgressIndicator(
              value: _totalLikertQuestions == 0 ? 0 : (_currentQuestionIndex + 1) / _totalLikertQuestions,
              backgroundColor: Colors.grey.shade200,
              color: const Color(0xFF8FB9A8),
            ),
            const SizedBox(height: 32),
            Text(
              "Question ${_currentQuestionIndex + 1} of $_totalLikertQuestions",
              style: GoogleFonts.inter(fontSize: 14, color: Colors.grey, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Text(
              "Over the last 2 weeks, how often have you been bothered by the following problems: ... (Item ${_currentQuestionIndex + 1})",
              style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 48),
            ...List.generate(4, (i) {
               final labels = ["Not at all", "Several days", "More than half the days", "Nearly every day"];
               final isActive = _answers['q${_currentQuestionIndex}'] == i;
               
               return Padding(
                 padding: const EdgeInsets.only(bottom: 12.0),
                 child: InkWell(
                   onTap: () {
                     setState(() => _answers['q${_currentQuestionIndex}'] = i);
                     if (_currentQuestionIndex < _totalLikertQuestions - 1) {
                        Future.delayed(const Duration(milliseconds: 300), () {
                           if (mounted) setState(() => _currentQuestionIndex++);
                        });
                     }
                   },
                   borderRadius: BorderRadius.circular(16),
                   child: Container(
                     padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                     decoration: BoxDecoration(
                        color: isActive ? const Color(0xFF8FB9A8).withValues(alpha: 0.1) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isActive ? const Color(0xFF8FB9A8) : Colors.grey.shade200, width: isActive ? 2 : 1),
                     ),
                     child: Row(
                       children: [
                         Container(
                           width: 24, height: 24,
                           decoration: BoxDecoration(
                             shape: BoxShape.circle,
                             border: Border.all(color: isActive ? const Color(0xFF8FB9A8) : Colors.grey, width: 2),
                             color: isActive ? const Color(0xFF8FB9A8) : Colors.transparent,
                           ),
                           child: isActive ? const Icon(Icons.circle, size: 10, color: Colors.white) : null,
                         ),
                         const SizedBox(width: 16),
                         Expanded(child: Text(labels[i], style: GoogleFonts.inter(fontSize: 16, fontWeight: isActive ? FontWeight.bold : FontWeight.normal))),
                       ],
                     ),
                   ),
                 ),
               );
            }),
          ],
        ),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 2. METAHEALTH & REFLEXOLOGY SOMATIC ENGINE
  // --------------------------------------------------------------------------
  Widget _buildSomaticBodyMap() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
           Container(
             padding: const EdgeInsets.all(16),
             decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
             child: Row(
               children: [
                  const Icon(Icons.info_outline, color: Colors.blue),
                  const SizedBox(width: 12),
                  Expanded(child: Text("Tap regions of the body matrix to log somatic pain points or meridian blockages.", style: GoogleFonts.inter(color: Colors.blue.shade900))),
               ],
             ),
           ),
           const SizedBox(height: 32),
           // Mock interactive map
           Container(
             height: 400,
             decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.grey.shade300),
             ),
             child: const Center(child: Text("[Interactive Body/Foot Matrix Placeholder]", style: TextStyle(color: Colors.grey))),
           ),
           const SizedBox(height: 32),
           TextField(
             decoration: InputDecoration(
               labelText: "Somatic Context / Metahealth Phase",
               border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
             ),
             onChanged: (val) => _answers['somatic_context'] = val,
             maxLines: 3,
           )
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 3. ART THERAPY ENGINE (FEATS / PPAT)
  // --------------------------------------------------------------------------
  Widget _buildArtTherapyUploader() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             Icon(Icons.palette_outlined, size: 80, color: Colors.purple.shade200),
             const SizedBox(height: 24),
             Text("Upload Patient Artwork", style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold)),
             const SizedBox(height: 12),
             Text(
               "Directive: ${widget.scoringRules['directive'] ?? 'Draw a person picking an apple from a tree.'}",
               textAlign: TextAlign.center,
               style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
             ),
             const SizedBox(height: 48),
             InkWell(
               onTap: () {
                  setState(() => _answers['mock_image_url'] = "https://s3.railway.app/art_therapy/mock_uuid.jpg");
               },
               child: Container(
                 width: double.infinity,
                 padding: const EdgeInsets.symmetric(vertical: 40),
                 decoration: BoxDecoration(
                   color: _answers.containsKey('mock_image_url') ? Colors.purple.shade50 : Colors.grey.shade50,
                   borderRadius: BorderRadius.circular(16),
                   border: Border.all(
                      color: _answers.containsKey('mock_image_url') ? Colors.purple : Colors.grey.shade300, 
                      style: BorderStyle.solid
                   ),
                 ),
                 child: Column(
                   children: [
                     Icon(_answers.containsKey('mock_image_url') ? Icons.check_circle : Icons.upload_file, size: 40, color: _answers.containsKey('mock_image_url') ? Colors.purple : Colors.grey),
                     const SizedBox(height: 12),
                     Text(_answers.containsKey('mock_image_url') ? 'Artwork Attached' : 'Tap to Upload PPAT Image', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: _answers.containsKey('mock_image_url') ? Colors.purple : Colors.black54)),
                   ],
                 ),
               ),
             )
          ],
        ),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // NAVIGATION & SUBMISSION
  // --------------------------------------------------------------------------
  Widget _buildBottomBar() {
    bool canSubmit = false;
    if (["SCREENING", "TRAUMA", "PERSONALITY"].contains(widget.type)) {
       canSubmit = _currentQuestionIndex == _totalLikertQuestions - 1 && _answers.containsKey('q${_currentQuestionIndex}');
    } else {
       canSubmit = _answers.isNotEmpty;
    }

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Colors.grey.shade200)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (_currentQuestionIndex > 0 && ["SCREENING", "TRAUMA", "PERSONALITY"].contains(widget.type))
               TextButton(
                  onPressed: () => setState(() => _currentQuestionIndex--), 
                  child: const Text('Previous', style: TextStyle(color: Colors.grey))
               )
            else
               const SizedBox(width: 80),
               
            if (_submitting)
               const CircularProgressIndicator(color: Color(0xFF8FB9A8))
            else
               ElevatedButton(
                 onPressed: canSubmit ? _submitAssessment : null,
                 style: ElevatedButton.styleFrom(
                   backgroundColor: const Color(0xFF8FB9A8),
                   foregroundColor: Colors.white,
                   disabledBackgroundColor: Colors.grey.shade300,
                   shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                   padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                   elevation: 0,
                 ),
                 child: const Text('Submit Assessment', style: TextStyle(fontWeight: FontWeight.bold)),
               )
          ],
        ),
      ),
    );
  }
}
