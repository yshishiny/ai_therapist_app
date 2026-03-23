import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:convert';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../core/api_client.dart';

class PatientReportTab extends StatefulWidget {
  final String patientId;

  const PatientReportTab({super.key, required this.patientId});

  @override
  State<PatientReportTab> createState() => _PatientReportTabState();
}

class _PatientReportTabState extends State<PatientReportTab> {
  bool _generating = false;
  String? _error;
  String? _reportMarkdown;

  Future<void> _exportPdf() async {
    final markdown = _reportMarkdown;
    if (markdown == null) return;

    final doc = pw.Document();
    final titleStyle = pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold);
    final h2Style = pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: const PdfColor.fromInt(0xFF8FB9A8));
    const bodyStyle = pw.TextStyle(fontSize: 11);
    final italicStyle = pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic, color: PdfColors.grey600);

    final List<pw.Widget> widgets = [];

    for (final rawLine in markdown.split('\n')) {
      final line = rawLine.trim();
      if (line.isEmpty) {
        widgets.add(pw.SizedBox(height: 6));
      } else if (line.startsWith('# ')) {
        widgets.add(pw.Text(line.substring(2), style: titleStyle));
        widgets.add(pw.SizedBox(height: 4));
      } else if (line.startsWith('## ')) {
        widgets.add(pw.SizedBox(height: 8));
        widgets.add(pw.Text(line.substring(3), style: h2Style));
        widgets.add(pw.Divider(color: PdfColors.grey300));
      } else if (line.startsWith('---')) {
        widgets.add(pw.Divider(color: PdfColors.grey400));
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        final text = line.substring(2).replaceAll(RegExp(r'\*\*(.+?)\*\*'), r'$1');
        widgets.add(pw.Bullet(text: text, style: bodyStyle));
      } else if (RegExp(r'^\d+\. ').hasMatch(line)) {
        final text = line.replaceAll(RegExp(r'\*\*(.+?)\*\*'), r'$1');
        widgets.add(pw.Padding(
          padding: const pw.EdgeInsets.only(left: 12, bottom: 2),
          child: pw.Text(text, style: bodyStyle),
        ));
      } else if (line.startsWith('*') && line.endsWith('*')) {
        widgets.add(pw.Text(line.replaceAll('*', ''), style: italicStyle));
      } else {
        final text = line.replaceAll(RegExp(r'\*\*(.+?)\*\*'), r'$1').replaceAll('*', '');
        widgets.add(pw.Text(text, style: bodyStyle));
        widgets.add(pw.SizedBox(height: 2));
      }
    }

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.symmetric(horizontal: 40, vertical: 48),
        build: (context) => widgets,
      ),
    );

    await Printing.sharePdf(
      bytes: await doc.save(),
      filename: 'clinical_report_patient_${widget.patientId}.pdf',
    );
  }

  Future<void> _generateReport() async {
    setState(() {
      _generating = true;
      _error = null;
    });

    try {
      final resp = await ApiClient.instance.post(
        '/patients/${widget.patientId}/report/generate',
        body: {
          'include_homework': true,
          'include_assessments': true,
          'include_sessions': true,
        },
      );

      if (resp.statusCode == 200) {
        final payload = jsonDecode(resp.body) as Map<String, dynamic>;
        setState(() {
          _reportMarkdown = payload['report_markdown'] as String?;
          _error = _reportMarkdown == null || _reportMarkdown!.isEmpty
              ? 'The AI service returned an empty report.'
              : null;
        });
      } else {
        setState(() =>
            _error = 'Engine failed to initialize synthesis. HTTP ${resp.statusCode}');
      }
    } catch (e) {
      setState(() => _error = 'Network failure.');
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_reportMarkdown != null) {
      return Container(
        color: Colors.white,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Professional Report', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: const Color(0xFF8FB9A8))),
                  Row(
                    children: [
                      TextButton.icon(
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Regenerate'),
                        onPressed: _generateReport,
                        style: TextButton.styleFrom(iconColor: Colors.grey, foregroundColor: Colors.grey),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.print, size: 16),
                        label: const Text('Export PDF'),
                        style: ElevatedButton.styleFrom(
                           backgroundColor: const Color(0xFF8FB9A8),
                           foregroundColor: Colors.white,
                           elevation: 0,
                        ),
                        onPressed: _exportPdf,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: Markdown(
                data: _reportMarkdown!,
                styleSheet: MarkdownStyleSheet(
                  h1: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: const Color(0xFF2D3748)),
                  h2: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: const Color(0xFF8FB9A8)),
                  p: GoogleFonts.inter(fontSize: 14, height: 1.6, color: Colors.grey.shade800),
                  listBullet: const TextStyle(color: Color(0xFF8FB9A8)),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
             Container(
               padding: const EdgeInsets.all(24),
               decoration: BoxDecoration(
                 color: const Color(0xFF8FB9A8).withValues(alpha: 0.1),
                 shape: BoxShape.circle,
               ),
               child: const Icon(Icons.auto_awesome, size: 48, color: Color(0xFF8FB9A8)),
             ),
             const SizedBox(height: 24),
             Text(
               'AI Clinical Synthesizer',
               style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: const Color(0xFF2D3748)),
             ),
             const SizedBox(height: 12),
             Text(
               'Generate a comprehensive, professional diagnostic report leveraging all longitudinal assessments, session notes, and specific trauma/somatic indicators.',
               textAlign: TextAlign.center,
               style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
             ),
             const SizedBox(height: 32),
             if (_generating)
                const CircularProgressIndicator(color: Color(0xFF8FB9A8))
             else
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _generateReport,
                    icon: const Icon(Icons.science),
                    label: const Text('Generate Professional Report', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8FB9A8),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ),
             if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 16.0),
                  child: Text(_error!, style: const TextStyle(color: Colors.red)),
                )
          ],
        ),
      ),
    );
  }
}
