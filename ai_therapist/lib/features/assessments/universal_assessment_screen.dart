import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
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
               final isActive = _answers['q$_currentQuestionIndex'] == i;
               
               return Padding(
                 padding: const EdgeInsets.only(bottom: 12.0),
                 child: InkWell(
                   onTap: () {
                     setState(() => _answers['q$_currentQuestionIndex'] = i);
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
           _BodyMapWidget(
             selectedRegions: (_answers['selected_regions'] as Set<String>?) ?? {},
             onChanged: (regions) =>
                 setState(() => _answers['selected_regions'] = regions),
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
             const SizedBox(height: 32),
             _ArtImagePicker(
               imagePath: _answers['image_path'] as String?,
               onPicked: (path, base64) => setState(() {
                 _answers['image_path'] = path;
                 _answers['image_base64'] = base64;
               }),
             ),
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
       canSubmit = _currentQuestionIndex == _totalLikertQuestions - 1 && _answers.containsKey('q$_currentQuestionIndex');
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

// ─── Interactive Body Map ──────────────────────────────────────────────────────
//
// Tappable front/back body silhouette for Reflexology & Metahealth assessments.
// Each labelled region is a named Rect on the canvas; tapping toggles selection.

class _BodyMapWidget extends StatefulWidget {
  final Set<String> selectedRegions;
  final ValueChanged<Set<String>> onChanged;

  const _BodyMapWidget({
    required this.selectedRegions,
    required this.onChanged,
  });

  @override
  State<_BodyMapWidget> createState() => _BodyMapWidgetState();
}

class _BodyMapWidgetState extends State<_BodyMapWidget> {
  // Body regions with relative positions (0–1 of canvas size)
  static const List<_BodyRegion> _regions = [
    _BodyRegion('Head',           0.38, 0.01, 0.24, 0.10),
    _BodyRegion('Neck',           0.42, 0.11, 0.16, 0.06),
    _BodyRegion('Left Shoulder',  0.18, 0.14, 0.20, 0.10),
    _BodyRegion('Right Shoulder', 0.62, 0.14, 0.20, 0.10),
    _BodyRegion('Chest',          0.32, 0.17, 0.36, 0.13),
    _BodyRegion('Left Arm',       0.10, 0.24, 0.18, 0.22),
    _BodyRegion('Right Arm',      0.72, 0.24, 0.18, 0.22),
    _BodyRegion('Abdomen',        0.32, 0.30, 0.36, 0.13),
    _BodyRegion('Pelvis',         0.32, 0.43, 0.36, 0.10),
    _BodyRegion('Left Hand',      0.06, 0.46, 0.14, 0.10),
    _BodyRegion('Right Hand',     0.80, 0.46, 0.14, 0.10),
    _BodyRegion('Left Thigh',     0.28, 0.53, 0.18, 0.16),
    _BodyRegion('Right Thigh',    0.54, 0.53, 0.18, 0.16),
    _BodyRegion('Left Knee',      0.28, 0.69, 0.18, 0.08),
    _BodyRegion('Right Knee',     0.54, 0.69, 0.18, 0.08),
    _BodyRegion('Left Shin',      0.28, 0.77, 0.18, 0.13),
    _BodyRegion('Right Shin',     0.54, 0.77, 0.18, 0.13),
    _BodyRegion('Left Foot',      0.24, 0.90, 0.20, 0.09),
    _BodyRegion('Right Foot',     0.56, 0.90, 0.20, 0.09),
  ];

  void _onTap(TapDownDetails details, BoxConstraints constraints) {
    final dx = details.localPosition.dx / constraints.maxWidth;
    final dy = details.localPosition.dy / constraints.maxHeight;
    for (final r in _regions) {
      if (dx >= r.x && dx <= r.x + r.w && dy >= r.y && dy <= r.y + r.h) {
        final updated = Set<String>.from(widget.selectedRegions);
        if (updated.contains(r.name)) {
          updated.remove(r.name);
        } else {
          updated.add(r.name);
        }
        widget.onChanged(updated);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Selected: ${widget.selectedRegions.isEmpty ? "none" : widget.selectedRegions.join(", ")}',
          style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            return GestureDetector(
              onTapDown: (d) => _onTap(d, constraints),
              child: CustomPaint(
                size: Size(constraints.maxWidth, constraints.maxWidth * 1.1),
                painter: _BodyPainter(
                  regions: _regions,
                  selected: widget.selectedRegions,
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 4,
          children: widget.selectedRegions.map((name) => Chip(
            label: Text(name, style: const TextStyle(fontSize: 11)),
            backgroundColor: const Color(0xFF8FB9A8).withValues(alpha: 0.2),
            deleteIcon: const Icon(Icons.close, size: 14),
            onDeleted: () {
              final updated = Set<String>.from(widget.selectedRegions)..remove(name);
              widget.onChanged(updated);
            },
          )).toList(),
        ),
      ],
    );
  }
}

class _BodyRegion {
  final String name;
  final double x, y, w, h; // relative 0–1
  const _BodyRegion(this.name, this.x, this.y, this.w, this.h);
}

class _BodyPainter extends CustomPainter {
  final List<_BodyRegion> regions;
  final Set<String> selected;

  const _BodyPainter({required this.regions, required this.selected});

  @override
  void paint(Canvas canvas, Size size) {
    final fillPaint = Paint()..style = PaintingStyle.fill;
    final borderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;
    final textPainter = TextPainter(textDirection: TextDirection.ltr);

    for (final r in regions) {
      final rect = Rect.fromLTWH(
        r.x * size.width,
        r.y * size.height,
        r.w * size.width,
        r.h * size.height,
      );
      final rRect = RRect.fromRectAndRadius(rect, const Radius.circular(6));
      final isSelected = selected.contains(r.name);

      fillPaint.color = isSelected
          ? const Color(0xFF8FB9A8).withValues(alpha: 0.55)
          : const Color(0xFFEDF2F0);
      borderPaint.color = isSelected
          ? const Color(0xFF5A9E8A)
          : const Color(0xFFBDD4CE);

      canvas.drawRRect(rRect, fillPaint);
      canvas.drawRRect(rRect, borderPaint);

      // Label
      textPainter.text = TextSpan(
        text: r.name,
        style: TextStyle(
          fontSize: rect.height * 0.38,
          color: isSelected ? const Color(0xFF2D6A5A) : Colors.grey.shade600,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      );
      textPainter.layout(maxWidth: rect.width - 4);
      textPainter.paint(
        canvas,
        Offset(
          rect.left + (rect.width - textPainter.width) / 2,
          rect.top + (rect.height - textPainter.height) / 2,
        ),
      );
    }
  }

  @override
  bool shouldRepaint(_BodyPainter old) => old.selected != selected;
}

// ─── Art Therapy Image Picker ─────────────────────────────────────────────────

class _ArtImagePicker extends StatefulWidget {
  final String? imagePath;
  final void Function(String path, String base64) onPicked;

  const _ArtImagePicker({required this.imagePath, required this.onPicked});

  @override
  State<_ArtImagePicker> createState() => _ArtImagePickerState();
}

class _ArtImagePickerState extends State<_ArtImagePicker> {
  bool _loading = false;
  final _picker = ImagePicker();

  Future<void> _pick(ImageSource source) async {
    setState(() => _loading = true);
    try {
      final xfile = await _picker.pickImage(
        source: source,
        imageQuality: 80,
        maxWidth: 1200,
      );
      if (xfile != null) {
        final bytes = await xfile.readAsBytes();
        widget.onPicked(xfile.path, base64Encode(bytes));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSourceDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take photo'),
              onTap: () { Navigator.pop(context); _pick(ImageSource.camera); },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from gallery'),
              onTap: () { Navigator.pop(context); _pick(ImageSource.gallery); },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasImage = widget.imagePath != null;
    return GestureDetector(
      onTap: _loading ? null : _showSourceDialog,
      child: Container(
        width: double.infinity,
        height: hasImage ? 260 : 160,
        decoration: BoxDecoration(
          color: hasImage ? Colors.purple.shade50 : Colors.grey.shade50,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: hasImage ? Colors.purple.shade300 : Colors.grey.shade300,
          ),
        ),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : hasImage
                ? Stack(
                    fit: StackFit.expand,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(15),
                        child: Image.file(File(widget.imagePath!),
                            fit: BoxFit.cover),
                      ),
                      Positioned(
                        bottom: 8, right: 8,
                        child: ElevatedButton.icon(
                          onPressed: _showSourceDialog,
                          icon: const Icon(Icons.refresh, size: 14),
                          label: const Text('Replace'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.purple,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                          ),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.upload_file, size: 40,
                          color: Colors.purple.shade200),
                      const SizedBox(height: 12),
                      Text('Tap to upload PPAT artwork',
                          style: GoogleFonts.inter(
                              fontWeight: FontWeight.bold,
                              color: Colors.black54)),
                      const SizedBox(height: 4),
                      Text('Camera or gallery',
                          style: GoogleFonts.inter(
                              fontSize: 12, color: Colors.grey)),
                    ],
                  ),
      ),
    );
  }
}
