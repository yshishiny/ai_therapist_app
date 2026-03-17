import 'package:flutter/material.dart';
import '../../core/ai_service_r2.dart';

enum ApprovalState { pending, approved, rejected, edited }

class SectionState {
  final String title;
  dynamic content;
  ApprovalState state;
  final bool isEditable;
  TextEditingController? editController;

  SectionState({
    required this.title,
    required this.content,
    this.state = ApprovalState.pending,
    this.isEditable = false,
  }) {
    if (isEditable && content is String) {
      editController = TextEditingController(text: content);
    }
  }
}

class SessionAiReviewScreen extends StatefulWidget {
  final Map<String, dynamic> initialAiData;
  final List<RiskFlag> riskFlags;

  const SessionAiReviewScreen({
    super.key,
    required this.initialAiData,
    this.riskFlags = const [],
  });

  @override
  _SessionAiReviewScreenState createState() => _SessionAiReviewScreenState();
}

class _SessionAiReviewScreenState extends State<SessionAiReviewScreen> {
  late List<SectionState> sections;
  bool _hasHighSeverityRisk = false;

  @override
  void initState() {
    super.initState();
    _initializeSections();
    _checkRiskSeverity();
  }

  void _checkRiskSeverity() {
    _hasHighSeverityRisk = widget.riskFlags.any((risk) =>
        risk.severity.toLowerCase() == 'high' ||
        risk.severity.toLowerCase() == 'critical');
  }

  void _initializeSections() {
    sections = [];

    // Initialize editable sections
    if (widget.initialAiData.containsKey('summary')) {
      sections.add(SectionState(
        title: 'Summary',
        content: widget.initialAiData['summary'],
        isEditable: true,
      ));
    }
    if (widget.initialAiData.containsKey('soap')) {
      sections.add(SectionState(
        title: 'SOAP Note',
        // In a real app we might flatten SOAP or map it, using string for simplicity in UI
        content: widget.initialAiData['soap'].toString(),
        isEditable: true,
      ));
    }

    // Initialize non-editable complex sections
    if (widget.initialAiData.containsKey('themes')) {
      sections.add(SectionState(
        title: 'Themes',
        content: widget.initialAiData['themes'],
      ));
    }
    if (widget.initialAiData.containsKey('nextFocus')) {
      sections.add(SectionState(
        title: 'Next Focus',
        content: widget.initialAiData['nextFocus'],
      ));
    }
    if (widget.initialAiData.containsKey('homework')) {
      sections.add(SectionState(
        title: 'Homework Proposals',
        content: widget.initialAiData['homework'],
      ));
    }
  }

  int get _approvedCount {
    return sections
        .where((s) =>
            s.state == ApprovalState.approved ||
            s.state == ApprovalState.edited)
        .length;
  }

  void _handleSave() {
    if (_hasHighSeverityRisk) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content:
                Text('Cannot save. Please address High/Critical risks first.')),
      );
      return;
    }

    // Prepare accepted data payload to return
    Map<String, dynamic> acceptedData = {};
    for (var section in sections) {
      if (section.state == ApprovalState.approved ||
          section.state == ApprovalState.edited) {
        // If it was editable, take the controller's text as the latest content
        if (section.isEditable && section.editController != null) {
          acceptedData[section.title.toLowerCase()] =
              section.editController!.text;
        } else {
          acceptedData[section.title.toLowerCase()] = section.content;
        }
      }
    }

    Navigator.pop(context, acceptedData);
  }

  @override
  void dispose() {
    for (var s in sections) {
      s.editController?.dispose();
    }
    super.dispose();
  }

  Widget _buildRiskBanner() {
    if (widget.riskFlags.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      color:
          _hasHighSeverityRisk ? Colors.red.shade100 : Colors.orange.shade100,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: _hasHighSeverityRisk
                    ? Colors.red.shade900
                    : Colors.orange.shade900,
              ),
              const SizedBox(width: 8),
              Text(
                'Action Required: Risk Flags Detected',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: _hasHighSeverityRisk
                      ? Colors.red.shade900
                      : Colors.orange.shade900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...widget.riskFlags.map((risk) => Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Text(
                  '• [${risk.severity.toUpperCase()}] ${risk.category}: "${risk.exactQuote}"',
                  style: TextStyle(
                    color: _hasHighSeverityRisk
                        ? Colors.red.shade900
                        : Colors.orange.shade900,
                  ),
                ),
              )),
          if (_hasHighSeverityRisk)
            const Padding(
              padding: EdgeInsets.only(top: 12.0),
              child: Text(
                'Ensure clinical protocols are followed. Automatic saving disabled until risks are addressed and severity reduced.',
                style:
                    TextStyle(fontWeight: FontWeight.bold, color: Colors.red),
              ),
            ),
        ],
      ),
    );
  }

  Color _getBorderColor(ApprovalState state) {
    switch (state) {
      case ApprovalState.approved:
        return Colors.green;
      case ApprovalState.rejected:
        return Colors.red;
      case ApprovalState.edited:
        return Colors.blue;
      case ApprovalState.pending:
      default:
        return Colors.grey.shade300;
    }
  }

  Widget _buildSectionContent(SectionState section) {
    if (section.isEditable && section.editController != null) {
      return TextField(
        controller: section.editController,
        maxLines: null,
        decoration: const InputDecoration(border: OutlineInputBorder()),
        onChanged: (val) {
          setState(() {
            section.state = ApprovalState.edited;
          });
        },
      );
    } else {
      // Non-editable display string format
      return Text(section.content.toString());
    }
  }

  Widget _buildSectionCard(SectionState section) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(
        side: BorderSide(color: _getBorderColor(section.state), width: 2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  section.title,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 18),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getBorderColor(section.state).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    section.state.name.toUpperCase(),
                    style: TextStyle(
                        color: _getBorderColor(section.state),
                        fontSize: 12,
                        fontWeight: FontWeight.bold),
                  ),
                )
              ],
            ),
            const SizedBox(height: 12),
            _buildSectionContent(section),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      section.state = ApprovalState.rejected;
                    });
                  },
                  icon: const Icon(Icons.close, color: Colors.red),
                  label:
                      const Text('Reject', style: TextStyle(color: Colors.red)),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: () {
                    setState(() {
                      section.state =
                          section.editController?.text != section.content
                              ? ApprovalState.edited
                              : ApprovalState.approved;
                    });
                  },
                  icon: const Icon(Icons.check, color: Colors.green),
                  label: const Text('Approve',
                      style: TextStyle(color: Colors.green)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green.shade50,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Content Review'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          _buildRiskBanner(),
          Expanded(
            child: ListView.builder(
              itemCount: sections.length,
              itemBuilder: (context, index) {
                return _buildSectionCard(sections[index]);
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton(
            onPressed: _hasHighSeverityRisk ? null : _handleSave,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child:
                Text('Approve & Save ($_approvedCount / ${sections.length})'),
          ),
        ),
      ),
    );
  }
}
