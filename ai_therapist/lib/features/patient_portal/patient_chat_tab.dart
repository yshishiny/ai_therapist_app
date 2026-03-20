import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/api_client.dart';

/// Bubble-style AI Companion chat for in-between session support
class PatientChatTab extends StatefulWidget {
  const PatientChatTab({super.key});

  @override
  State<PatientChatTab> createState() => _PatientChatTabState();
}

class _PatientChatTabState extends State<PatientChatTab> {
  final _ctrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  final List<_ChatMessage> _messages = [];
  String? _conversationId;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    // Welcome message
    _messages.add(const _ChatMessage(
      text: "Hi! I'm your AI Companion 💚 I'm here to support you between sessions. You can share how you're feeling, reflect on your homework, or just talk. How are you today?",
      isUser: false,
    ));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _sending) return;
    _ctrl.clear();
    setState(() {
      _messages.add(_ChatMessage(text: text, isUser: true));
      _sending = true;
    });
    _scrollToBottom();

    try {
      final resp = await ApiClient.instance.post(
        '/me/ai-chat',
        body: jsonEncode({
          'message': text,
          'conversation_id': _conversationId,
        }),
      );
      if (resp.statusCode == 200 && mounted) {
        final data = jsonDecode(resp.body);
        _conversationId ??= data['conversation_id'];
        setState(() => _messages.add(_ChatMessage(text: data['reply'] as String, isUser: false)));
      } else {
        setState(() => _messages.add(const _ChatMessage(text: "Something went wrong. Please try again.", isUser: false)));
      }
    } catch (_) {
      if (mounted) setState(() => _messages.add(const _ChatMessage(text: "I'm having trouble connecting. Please check your network.", isUser: false)));
    } finally {
      if (mounted) setState(() => _sending = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xFF8FB9A8), Color(0xFF6FA090)]),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Companion', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('Here to listen', style: GoogleFonts.inter(color: Colors.grey, fontSize: 11)),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => showDialog(
              context: context,
              builder: (_) => AlertDialog(
                title: const Text('About AI Companion'),
                content: const Text(
                  'This AI provides emotional support between therapy sessions. It is NOT a substitute for crisis care.\n\nIf you are in immediate danger, please call your local emergency services.',
                ),
                actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Got it'))],
              ),
            ),
            child: const Text('Info', style: TextStyle(color: Color(0xFF8FB9A8))),
          ),
        ],
      ),
      body: Column(
        children: [
          // Disclaimer banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.amber.shade50,
            child: Text(
              '🛈  AI support only — not a crisis service.',
              style: GoogleFonts.inter(fontSize: 11, color: Colors.amber.shade900),
              textAlign: TextAlign.center,
            ),
          ),

          // Chat messages
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              itemCount: _messages.length + (_sending ? 1 : 0),
              itemBuilder: (context, i) {
                if (_sending && i == _messages.length) {
                  return const _TypingIndicator();
                }
                final m = _messages[i];
                return _BubbleTile(message: m);
              },
            ),
          ),

          // Input bar
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            padding: EdgeInsets.fromLTRB(16, 12, 16, 12 + MediaQuery.of(context).viewInsets.bottom),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _ctrl,
                    textCapitalization: TextCapitalization.sentences,
                    maxLines: null,
                    style: GoogleFonts.inter(fontSize: 15),
                    decoration: InputDecoration(
                      hintText: "Share how you're feeling...",
                      hintStyle: const TextStyle(color: Colors.grey),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: Color(0xFF8FB9A8), width: 2),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: _send,
                  child: Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF8FB9A8), Color(0xFF6FA090)]),
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: const Color(0xFF8FB9A8).withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 4))],
                    ),
                    child: _sending
                        ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)))
                        : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatMessage {
  final String text;
  final bool isUser;
  const _ChatMessage({required this.text, required this.isUser});
}

class _BubbleTile extends StatelessWidget {
  final _ChatMessage message;
  const _BubbleTile({required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!message.isUser) ...[
            Container(
              width: 28, height: 28,
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xFF8FB9A8), Color(0xFF6FA090)]),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 14),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: message.isUser ? const Color(0xFF8FB9A8) : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(20),
                  topRight: const Radius.circular(20),
                  bottomLeft: message.isUser ? const Radius.circular(20) : const Radius.circular(4),
                  bottomRight: message.isUser ? const Radius.circular(4) : const Radius.circular(20),
                ),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6, offset: const Offset(0, 2))],
              ),
              child: Text(
                message.text,
                style: TextStyle(
                  color: message.isUser ? Colors.white : Colors.black87,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            ),
          ),
          if (message.isUser) const SizedBox(width: 8),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();
  @override State<_TypingIndicator> createState() => _TypingIndicatorState();
}
class _TypingIndicatorState extends State<_TypingIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800))..repeat(reverse: true);
  }
  @override void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 28, height: 28,
            decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF8FB9A8), Color(0xFF6FA090)]), shape: BoxShape.circle),
            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 14),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6)]),
            child: AnimatedBuilder(
              animation: _ctrl,
              builder: (_, __) => Row(
                mainAxisSize: MainAxisSize.min,
                children: List.generate(3, (i) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 6, height: 6,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color.lerp(Colors.grey.shade300, const Color(0xFF8FB9A8), _ctrl.value),
                  ),
                )),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
