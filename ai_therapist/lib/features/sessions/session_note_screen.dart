import 'package:flutter/material.dart';
import '../../app/theme.dart';
import '../../core/widgets/ai_action_chip.dart';
import 'dart:async';

class SessionNoteScreen extends StatefulWidget {
  final String patientName;
  final bool isRecording;

  const SessionNoteScreen({
    super.key, 
    required this.patientName,
    this.isRecording = false,
  });

  @override
  State<SessionNoteScreen> createState() => _SessionNoteScreenState();
}

class _SessionNoteScreenState extends State<SessionNoteScreen> {
  late bool _isRecording;
  final TextEditingController _noteController = TextEditingController();
  final Stopwatch _stopwatch = Stopwatch();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _isRecording = widget.isRecording;
    if (_isRecording) {
      _startTimer();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _noteController.dispose();
    super.dispose();
  }

  void _startTimer() {
    _stopwatch.start();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {});
    });
  }

  void _stopTimer() {
    _stopwatch.stop();
    _timer?.cancel();
  }

  String _formattedTime() {
    final minutes = _stopwatch.elapsed.inMinutes.toString().padLeft(2, '0');
    final seconds = (_stopwatch.elapsed.inSeconds % 60).toString().padLeft(2, '0');
    return "$minutes:$seconds";
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text("Active Session: ${widget.patientName}"),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // Save & Close
            }, 
            child: const Text("Save")
          )
        ],
      ),
      body: Column(
        children: [
          // Scribe Status Bar
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 20),
            color: _isRecording 
                ? const Color(0xFFFFF1F1) // Calm rose
                : theme.colorScheme.primaryContainer,
            child: Row(
              children: [
                Icon(
                  _isRecording ? Icons.fiber_manual_record : Icons.mic_none,
                  color: _isRecording ? ClinicalTheme.riskHigh : theme.colorScheme.primary,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Text(
                  _isRecording ? "AI Scribe Active • ${_formattedTime()}" : "AI Scribe Ready",
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: _isRecording ? ClinicalTheme.riskHigh : theme.colorScheme.primary,
                  ),
                ),
                const Spacer(),
                if (!_isRecording && _stopwatch.elapsed.inSeconds > 0)
                  Text("Paused", style: theme.textTheme.labelLarge?.copyWith(color: theme.colorScheme.primary)),
              ],
            ),
          ),
          // Note Area
          Expanded(
            child: TextField(
              controller: _noteController,
              maxLines: null,
              expands: true,
              style: theme.textTheme.bodyLarge,
              decoration: const InputDecoration(
                hintText: "Start typing session notes or tap Start AI Scribe...",
                fillColor: Colors.transparent,
                contentPadding: EdgeInsets.all(24),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
              ),
            ),
          ),
          // AI Toolbar
          Container(
            height: 60,
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: theme.colorScheme.outline)),
              color: theme.colorScheme.surface,
            ),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                AiActionChip(label: "SOAP Note", icon: Icons.article, onTap: () {}),
                const SizedBox(width: 8),
                AiActionChip(label: "Summary", icon: Icons.summarize, onTap: () {}),
                const SizedBox(width: 8),
                AiActionChip(label: "Risk Flag", icon: Icons.flag, onTap: () {}),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: FilledButton.icon(
            onPressed: () {
              setState(() {
                _isRecording = !_isRecording;
                if (_isRecording) {
                  _startTimer();
                } else {
                  _stopTimer();
                }
              });
            },
            style: FilledButton.styleFrom(
              backgroundColor: _isRecording ? theme.colorScheme.surfaceContainerHighest : theme.colorScheme.primary,
              foregroundColor: _isRecording ? theme.colorScheme.onSurface : theme.colorScheme.onPrimary,
              minimumSize: const Size.fromHeight(50),
            ),
            icon: Icon(_isRecording ? Icons.pause : Icons.play_arrow),
            label: Text(_isRecording ? "Pause Scribe" : "Start Scribe"),
          ),
        ),
      ),
    );
  }
}
