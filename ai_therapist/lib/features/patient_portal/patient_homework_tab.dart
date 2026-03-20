import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_client.dart';

class PatientHomeworkTab extends StatefulWidget {
  const PatientHomeworkTab({super.key});

  @override
  State<PatientHomeworkTab> createState() => _PatientHomeworkTabState();
}

class _PatientHomeworkTabState extends State<PatientHomeworkTab> {
  bool _loading = true;
  String? _error;
  List<dynamic> _tasks = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await ApiClient.instance.get('/me/homework');
      if (resp.statusCode == 200) {
        setState(() => _tasks = jsonDecode(resp.body));
      } else {
        setState(() => _error = 'Could not load homework.');
      }
    } catch (_) {
      setState(() => _error = 'Network error.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showSubmitDialog(dynamic task) async {
    final notesCtrl = TextEditingController();
    int rating = 3;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Submit Homework', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(task['title'] as String, style: GoogleFonts.inter(color: Colors.grey)),
              const SizedBox(height: 20),
              TextField(
                controller: notesCtrl,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: 'Reflection notes (optional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 20),
              Text('How helpful was this?', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (i) => IconButton(
                  onPressed: () => setModalState(() => rating = i + 1),
                  icon: Icon(
                    i < rating ? Icons.star_rounded : Icons.star_outline_rounded,
                    color: const Color(0xFF8FB9A8),
                    size: 32,
                  ),
                )),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    await _submitTask(task['id'], notesCtrl.text, rating);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8FB9A8),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Text('Mark Complete', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitTask(String taskId, String notes, int rating) async {
    try {
      final resp = await ApiClient.instance.post(
        '/me/homework/$taskId/submit',
        body: jsonEncode({'completion_notes': notes, 'helpfulness_rating': rating}),
      );
      if (resp.statusCode == 200 && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Great job! Task marked complete. 🎉'),
          backgroundColor: Color(0xFF8FB9A8),
        ));
        _fetch();
      }
    } catch (_) {}
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'completed': return Colors.green;
      case 'overdue': return Colors.red;
      default: return const Color(0xFF8FB9A8);
    }
  }

  IconData _taskIcon(String? type) {
    switch (type) {
      case 'journaling': return Icons.edit_note_rounded;
      case 'breathing': return Icons.air;
      case 'reading': return Icons.menu_book_outlined;
      case 'exercise': return Icons.fitness_center;
      default: return Icons.assignment_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text('My Homework', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetch, color: Colors.grey),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF8FB9A8)))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : _tasks.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.task_alt, size: 64, color: Color(0xFF8FB9A8)),
                          const SizedBox(height: 16),
                          Text('All caught up!', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold)),
                          Text('No homework assigned yet.', style: GoogleFonts.inter(color: Colors.grey)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetch,
                      color: const Color(0xFF8FB9A8),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _tasks.length,
                        itemBuilder: (context, i) {
                          final t = _tasks[i];
                          final status = t['status'] as String? ?? 'pending';
                          final isDone = status == 'completed';
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: isDone ? Colors.green.shade100 : Colors.grey.shade100),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(16),
                              leading: Container(
                                width: 48, height: 48,
                                decoration: BoxDecoration(
                                  color: _statusColor(status).withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(_taskIcon(t['task_type']), color: _statusColor(status)),
                              ),
                              title: Text(
                                t['title'] as String? ?? 'Task',
                                style: GoogleFonts.inter(
                                  fontWeight: FontWeight.bold,
                                  decoration: isDone ? TextDecoration.lineThrough : null,
                                  color: isDone ? Colors.grey : Colors.black87,
                                ),
                              ),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  t['description'] as String? ?? '',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(fontSize: 12, color: Colors.grey),
                                ),
                              ),
                              trailing: isDone
                                  ? const Icon(Icons.check_circle_rounded, color: Colors.green, size: 28)
                                  : ElevatedButton(
                                      onPressed: () => _showSubmitDialog(t),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF8FB9A8),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                      ),
                                      child: const Text('Submit'),
                                    ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
