import 'package:flutter/material.dart';

// ─── Dummy Model for MVP ──────────────────────────────────────────────────────
class SystemEvent {
  final String id;
  final String title;
  final String body;
  final DateTime timestamp;
  final bool isRead;
  final String type; // e.g., 'training', 'alert', 'system'

  SystemEvent({
    required this.id,
    required this.title,
    required this.body,
    required this.timestamp,
    this.isRead = false,
    required this.type,
  });
}

// ─── Inbox Screen ────────────────────────────────────────────────────────────
class EventsInboxScreen extends StatefulWidget {
  const EventsInboxScreen({super.key});

  @override
  _EventsInboxScreenState createState() => _EventsInboxScreenState();
}

class _EventsInboxScreenState extends State<EventsInboxScreen> {
  // In a real app, this would be wired to a NotificationDb or Firebase
  final List<SystemEvent> _events = [
    SystemEvent(
      id: 'e1',
      title: 'New Training Module Available',
      body:
          'The "Trauma-Informed CBT Approaches" clinical digest is now available for review.',
      timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      type: 'training',
    ),
    SystemEvent(
      id: 'e2',
      title: 'System Update: R2 Deployed',
      body:
          'AI Therapist has been updated with real-time early warnings, sparkline trend charts, and the new 5-tab patient folder view.',
      timestamp: DateTime.now().subtract(const Duration(days: 1)),
      type: 'system',
      isRead: true,
    ),
    SystemEvent(
      id: 'e3',
      title: 'Risk Engine Tuned',
      body:
          'The Early Warning algorithms have been tightened to surface medication non-adherence slightly sooner.',
      timestamp: DateTime.now().subtract(const Duration(days: 3)),
      type: 'alert',
      isRead: true,
    ),
  ];

  void _markAsRead(String id) {
    setState(() {
      final index = _events.indexWhere((e) => e.id == id);
      if (index != -1 && !_events[index].isRead) {
        final evt = _events[index];
        _events[index] = SystemEvent(
          id: evt.id,
          title: evt.title,
          body: evt.body,
          timestamp: evt.timestamp,
          type: evt.type,
          isRead: true,
        );
      }
    });

    // Handle deep-link payload routing here if necessary
    // Example: Navigator.push to Training Module if type == 'training'
  }

  void _markAllAsRead() {
    setState(() {
      for (int i = 0; i < _events.length; i++) {
        final evt = _events[i];
        if (!evt.isRead) {
          _events[i] = SystemEvent(
            id: evt.id,
            title: evt.title,
            body: evt.body,
            timestamp: evt.timestamp,
            type: evt.type,
            isRead: true,
          );
        }
      }
    });
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'training':
        return Icons.school;
      case 'alert':
        return Icons.warning_amber_rounded;
      case 'system':
        return Icons.system_update;
      default:
        return Icons.notifications;
    }
  }

  Color _getColorForType(String type) {
    switch (type) {
      case 'training':
        return Colors.blue;
      case 'alert':
        return Colors.orange;
      case 'system':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _events.where((e) => !e.isRead).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Inbox & Training Digest'),
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllAsRead,
              child: const Text('Mark All Read',
                  style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: _events.isEmpty
          ? const Center(child: Text('No new notifications or events.'))
          : ListView.separated(
              itemCount: _events.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final evt = _events[index];
                return ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  tileColor: evt.isRead
                      ? Colors.transparent
                      : Colors.blue.withOpacity(0.05),
                  leading: CircleAvatar(
                    backgroundColor:
                        _getColorForType(evt.type).withOpacity(0.2),
                    child: Icon(_getIconForType(evt.type),
                        color: _getColorForType(evt.type)),
                  ),
                  title: Text(
                    evt.title,
                    style: TextStyle(
                      fontWeight:
                          evt.isRead ? FontWeight.normal : FontWeight.bold,
                    ),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(evt.body,
                            maxLines: 2, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text(
                          _formatTimeAgo(evt.timestamp),
                          style: TextStyle(
                              fontSize: 12, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  onTap: () => _markAsRead(evt.id),
                );
              },
            ),
    );
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '\${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '\${diff.inHours}h ago';
    return '\${diff.inDays}d ago';
  }
}
