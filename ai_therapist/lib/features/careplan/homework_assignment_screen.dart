import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/ai_service_r2.dart';
import 'homework_service.dart';

class HomeworkAssignmentScreen extends StatefulWidget {
  final String patientId;
  final String sessionId;
  final String patientContextStr;

  const HomeworkAssignmentScreen({
    super.key,
    required this.patientId,
    required this.sessionId,
    required this.patientContextStr,
  });

  @override
  _HomeworkAssignmentScreenState createState() =>
      _HomeworkAssignmentScreenState();
}

class _HomeworkAssignmentScreenState extends State<HomeworkAssignmentScreen> {
  final AiService _aiService = AiService();
  late final HomeworkService _homeworkService;

  bool _isLoading = true;
  List<HomeworkProposal> _proposals = [];
  int? _selectedIndex;

  DateTime? _selectedDueDate;

  @override
  void initState() {
    super.initState();
    _homeworkService = HomeworkService(_aiService);
    _fetchProposals();
  }

  Future<void> _fetchProposals() async {
    setState(() => _isLoading = true);
    try {
      final results =
          await _aiService.proposeHomework(widget.patientContextStr);
      if (mounted) {
        setState(() {
          _proposals = results;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to load proposals: \$e')),
        );
      }
    }
  }

  Future<void> _pickDueDate() async {
    final dt = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 7)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (dt != null) {
      setState(() => _selectedDueDate = dt);
    }
  }

  Future<void> _assignHomework() async {
    if (_selectedIndex == null) return;

    final proposal = _proposals[_selectedIndex!];

    try {
      await _homeworkService.assignHomework(
        patientId: widget.patientId,
        sessionId: widget.sessionId,
        proposal: proposal,
        dueAt: _selectedDueDate,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Homework assigned successfully')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to assign homework: \$e')),
        );
      }
    }
  }

  Color _getDifficultyColor(String diff) {
    if (diff.toLowerCase().contains('easy')) return Colors.green;
    if (diff.toLowerCase().contains('hard')) return Colors.red;
    return Colors.orange;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Assign Homework'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchProposals,
          )
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: _selectedIndex != null ? _buildBottomBar() : null,
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Synthesizing session context...'),
            Text('Generating tailored homework proposals...',
                style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    if (_proposals.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.warning, size: 48, color: Colors.orange),
            const SizedBox(height: 16),
            const Text('No valid proposals generated.'),
            ElevatedButton(
              onPressed: _fetchProposals,
              child: const Text('Try Again'),
            )
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _proposals.length,
      itemBuilder: (context, index) {
        final p = _proposals[index];
        final isSelected = _selectedIndex == index;

        return Card(
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(
            side: BorderSide(
              color: isSelected
                  ? Theme.of(context).primaryColor
                  : Colors.transparent,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: isSelected ? 4 : 1,
          child: InkWell(
            onTap: () => setState(() => _selectedIndex = index),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          p.title,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                      ),
                      if (isSelected)
                        Icon(Icons.check_circle,
                            color: Theme.of(context).primaryColor),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Chip(
                        label: Text(p.difficulty,
                            style: const TextStyle(
                                fontSize: 12, color: Colors.white)),
                        backgroundColor: _getDifficultyColor(p.difficulty),
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                      const SizedBox(width: 8),
                      Chip(
                        label: Text(p.frequency,
                            style: const TextStyle(fontSize: 12)),
                        padding: EdgeInsets.zero,
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(p.description, style: const TextStyle(height: 1.4)),
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Clinical Rationale',
                            style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: Colors.indigo)),
                        const SizedBox(height: 4),
                        Text(p.rationale,
                            style: const TextStyle(
                                fontSize: 13, color: Colors.black87)),
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -5))
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Icon(Icons.event, color: Colors.grey),
                const SizedBox(width: 8),
                const Text('Due Date: ',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: _pickDueDate,
                  child: Text(
                    _selectedDueDate != null
                        ? DateFormat.yMMMd().format(_selectedDueDate!)
                        : 'Select Date',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _assignHomework,
                style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16)),
                child: const Text('Assign Homework'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
