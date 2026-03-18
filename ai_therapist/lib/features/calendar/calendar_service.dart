/// calendar_service.dart
/// API-backed calendar service that syncs appointments with the backend.
/// Replaces the purely local scheduling_service.dart for persistence.

library;

import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../core/api_client.dart';

// ─── Model ────────────────────────────────────────────────────────────────────

class CalendarAppointment {
  final String id;
  final String patientId;
  final DateTime startTime;
  final DateTime endTime;
  final String location; // IN_PERSON | ONLINE
  final String status;   // SCHEDULED | COMPLETED | CANCELLED | NO_SHOW
  final String? meetingLink;

  const CalendarAppointment({
    required this.id,
    required this.patientId,
    required this.startTime,
    required this.endTime,
    required this.location,
    required this.status,
    this.meetingLink,
  });

  factory CalendarAppointment.fromApi(Map<String, dynamic> json) {
    return CalendarAppointment(
      id: json['id'] as String,
      patientId: json['patient_id'] as String,
      startTime: DateTime.parse(json['start_time'] as String).toLocal(),
      endTime: DateTime.parse(json['end_time'] as String).toLocal(),
      location: json['location'] as String? ?? 'IN_PERSON',
      status: json['status'] as String? ?? 'SCHEDULED',
      meetingLink: json['meeting_link'] as String?,
    );
  }

  Map<String, dynamic> toApiPayload() => {
        'patient_id': patientId,
        'start_time': startTime.toUtc().toIso8601String(),
        'end_time': endTime.toUtc().toIso8601String(),
        'location': location,
        'meeting_link': meetingLink,
      };

  bool get isToday {
    final now = DateTime.now();
    return startTime.year == now.year &&
        startTime.month == now.month &&
        startTime.day == now.day;
  }

  Duration get duration => endTime.difference(startTime);
}

// ─── Service ──────────────────────────────────────────────────────────────────

class CalendarService extends ChangeNotifier {
  bool _isLoading = false;
  String? _error;
  List<CalendarAppointment> _appointments = [];

  bool get isLoading => _isLoading;
  String? get error => _error;
  List<CalendarAppointment> get appointments => _appointments;

  List<CalendarAppointment> get todaysAppointments =>
      _appointments.where((a) => a.isToday && a.status == 'SCHEDULED').toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));

  List<CalendarAppointment> appointmentsForDay(DateTime day) =>
      _appointments.where((a) {
        return a.startTime.year == day.year &&
            a.startTime.month == day.month &&
            a.startTime.day == day.day;
      }).toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));

  /// Fetch all appointments from backend.
  Future<void> refresh() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final resp = await ApiClient.instance.get('/appointments');
      if (resp.statusCode == 200) {
        final raw = jsonDecode(resp.body) as List<dynamic>;
        _appointments = raw
            .map((e) => CalendarAppointment.fromApi(e as Map<String, dynamic>))
            .toList();
      } else {
        _error = 'Failed to fetch appointments (${resp.statusCode}).';
      }
    } on ApiException catch (e) {
      _error = e.message;
      debugPrint('CalendarService error: $e');
    } catch (e) {
      _error = 'Unexpected error fetching appointments.';
      debugPrint('CalendarService unexpected: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Schedule a new appointment and push to backend.
  Future<CalendarAppointment?> schedule({
    required String patientId,
    required DateTime startTime,
    required DateTime endTime,
    String location = 'IN_PERSON',
    String? meetingLink,
  }) async {
    try {
      final draft = CalendarAppointment(
        id: '',
        patientId: patientId,
        startTime: startTime,
        endTime: endTime,
        location: location,
        status: 'SCHEDULED',
        meetingLink: meetingLink,
      );
      final resp = await ApiClient.instance.post(
        '/appointments',
        body: draft.toApiPayload(),
      );
      if (resp.statusCode == 201) {
        final created = CalendarAppointment.fromApi(
            jsonDecode(resp.body) as Map<String, dynamic>);
        _appointments.add(created);
        _appointments.sort((a, b) => a.startTime.compareTo(b.startTime));
        notifyListeners();
        return created;
      }
    } on ApiException catch (e) {
      debugPrint('CalendarService.schedule error: $e');
    }
    return null;
  }

  /// Update appointment status on backend and locally.
  Future<bool> updateStatus(String appointmentId, String newStatus) async {
    try {
      final resp = await ApiClient.instance.post(
        '/appointments/$appointmentId?new_status=$newStatus',
      );
      if (resp.statusCode == 200) {
        final idx = _appointments.indexWhere((a) => a.id == appointmentId);
        if (idx >= 0) {
          final old = _appointments[idx];
          _appointments[idx] = CalendarAppointment(
            id: old.id,
            patientId: old.patientId,
            startTime: old.startTime,
            endTime: old.endTime,
            location: old.location,
            status: newStatus,
            meetingLink: old.meetingLink,
          );
          notifyListeners();
        }
        return true;
      }
    } on ApiException catch (e) {
      debugPrint('CalendarService.updateStatus error: $e');
    }
    return false;
  }
}
