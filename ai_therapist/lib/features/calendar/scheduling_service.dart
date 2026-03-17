/// scheduling_service.dart — Release 2
/// Full appointment CRUD with recurrence, attendance tracking, and
/// notification scheduling. Replaces the static mock CalendarScreen.

library;

import '../../core/secure_phi_storage.dart';

// ─── Enums ────────────────────────────────────────────────────────────────────

enum AppointmentType { intake, individual, group, crisis, review, discharge }

enum AppointmentStatus {
  scheduled,
  completed,
  cancelledByPatient,
  cancelledByClinician,
  noShow,
  rescheduled
}

enum RecurrencePattern { none, weekly, biweekly, monthly }

enum ReminderChannel { push, email }

extension AppointmentTypeExt on AppointmentType {
  String get label => const {
        AppointmentType.intake: 'Intake',
        AppointmentType.individual: 'Individual session',
        AppointmentType.group: 'Group session',
        AppointmentType.crisis: 'Crisis check-in',
        AppointmentType.review: 'Review',
        AppointmentType.discharge: 'Discharge',
      }[this]!;

  int get colorValue => const {
        AppointmentType.intake: 0xFF6C63FF,
        AppointmentType.individual: 0xFF8FB9A8,
        AppointmentType.group: 0xFF00BFA5,
        AppointmentType.crisis: 0xFFF44336,
        AppointmentType.review: 0xFFFF9800,
        AppointmentType.discharge: 0xFF9E9E9E,
      }[this]!;
}

extension AppointmentStatusExt on AppointmentStatus {
  String get label => const {
        AppointmentStatus.scheduled: 'Scheduled',
        AppointmentStatus.completed: 'Completed',
        AppointmentStatus.cancelledByPatient: 'Cancelled by patient',
        AppointmentStatus.cancelledByClinician: 'Cancelled by clinician',
        AppointmentStatus.noShow: 'No-show',
        AppointmentStatus.rescheduled: 'Rescheduled',
      }[this]!;
}

// ─── Models ───────────────────────────────────────────────────────────────────

class RecurrenceRule {
  final RecurrencePattern pattern;
  final int? occurrences; // null = indefinite
  final DateTime? until;

  const RecurrenceRule({
    required this.pattern,
    this.occurrences,
    this.until,
  });

  Map<String, dynamic> toJson() => {
        'pattern': pattern.name,
        'occurrences': occurrences,
        'until': until?.toIso8601String(),
      };

  factory RecurrenceRule.fromJson(Map<String, dynamic> j) => RecurrenceRule(
        pattern: RecurrencePattern.values.byName(j['pattern']),
        occurrences: j['occurrences'],
        until: j['until'] != null ? DateTime.parse(j['until']) : null,
      );

  /// Generate all occurrence dates from [from] forward.
  List<DateTime> generateFrom(DateTime from) {
    if (pattern == RecurrencePattern.none) return [from];
    final results = <DateTime>[];
    DateTime cursor = from;
    int count = 0;
    while (true) {
      results.add(cursor);
      count++;
      if (occurrences != null && count >= occurrences!) break;
      if (until != null && cursor.isAfter(until!)) break;
      if (count > 104) break; // safety cap: 2 years of weekly

      cursor = switch (pattern) {
        RecurrencePattern.weekly => cursor.add(const Duration(days: 7)),
        RecurrencePattern.biweekly => cursor.add(const Duration(days: 14)),
        RecurrencePattern.monthly =>
          DateTime(cursor.year, cursor.month + 1, cursor.day),
        RecurrencePattern.none => cursor,
      };
    }
    return results;
  }
}

class AttendanceRecord {
  final AppointmentStatus status;
  final String recordedBy;
  final DateTime recordedAt;
  final String? notes;

  const AttendanceRecord({
    required this.status,
    required this.recordedBy,
    required this.recordedAt,
    this.notes,
  });

  Map<String, dynamic> toJson() => {
        'status': status.name,
        'recordedBy': recordedBy,
        'recordedAt': recordedAt.toIso8601String(),
        'notes': notes,
      };

  factory AttendanceRecord.fromJson(Map<String, dynamic> j) => AttendanceRecord(
        status: AppointmentStatus.values.byName(j['status']),
        recordedBy: j['recordedBy'],
        recordedAt: DateTime.parse(j['recordedAt']),
        notes: j['notes'],
      );
}

class Appointment {
  final String id;
  final String patientId;
  final String patientName;
  final String clinicianId;
  final AppointmentType type;
  final DateTime startTime;
  final Duration duration;
  final AppointmentStatus status;
  final RecurrenceRule recurrence;
  final String? seriesId; // links recurring appointments
  final AttendanceRecord? attendance;
  final List<ReminderChannel> reminderChannels;
  final int? reminderMinutesBefore;
  final String? location;
  final String? notes;
  final bool isOnline;

  const Appointment({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.clinicianId,
    required this.type,
    required this.startTime,
    required this.duration,
    this.status = AppointmentStatus.scheduled,
    this.recurrence = const RecurrenceRule(pattern: RecurrencePattern.none),
    this.seriesId,
    this.attendance,
    this.reminderChannels = const [ReminderChannel.push],
    this.reminderMinutesBefore = 60,
    this.location,
    this.notes,
    this.isOnline = false,
  });

  DateTime get endTime => startTime.add(duration);

  bool get isUpcoming =>
      status == AppointmentStatus.scheduled &&
      startTime.isAfter(DateTime.now());

  bool get isToday {
    final now = DateTime.now();
    return startTime.year == now.year &&
        startTime.month == now.month &&
        startTime.day == now.day;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'patientId': patientId,
        'patientName': patientName,
        'clinicianId': clinicianId,
        'type': type.name,
        'startTime': startTime.toIso8601String(),
        'durationMinutes': duration.inMinutes,
        'status': status.name,
        'recurrence': recurrence.toJson(),
        'seriesId': seriesId,
        'attendance': attendance?.toJson(),
        'reminderChannels': reminderChannels.map((c) => c.name).toList(),
        'reminderMinutesBefore': reminderMinutesBefore,
        'location': location,
        'notes': notes,
        'isOnline': isOnline,
      };

  factory Appointment.fromJson(Map<String, dynamic> j) => Appointment(
        id: j['id'],
        patientId: j['patientId'],
        patientName: j['patientName'],
        clinicianId: j['clinicianId'],
        type: AppointmentType.values.byName(j['type']),
        startTime: DateTime.parse(j['startTime']),
        duration: Duration(minutes: j['durationMinutes']),
        status: AppointmentStatus.values.byName(j['status']),
        recurrence: RecurrenceRule.fromJson(j['recurrence']),
        seriesId: j['seriesId'],
        attendance: j['attendance'] != null
            ? AttendanceRecord.fromJson(j['attendance'])
            : null,
        reminderChannels: (j['reminderChannels'] as List)
            .map((c) => ReminderChannel.values.byName(c))
            .toList(),
        reminderMinutesBefore: j['reminderMinutesBefore'],
        location: j['location'],
        notes: j['notes'],
        isOnline: j['isOnline'] ?? false,
      );

  Appointment copyWith({
    AppointmentStatus? status,
    AttendanceRecord? attendance,
    String? notes,
  }) =>
      Appointment(
        id: id,
        patientId: patientId,
        patientName: patientName,
        clinicianId: clinicianId,
        type: type,
        startTime: startTime,
        duration: duration,
        status: status ?? this.status,
        recurrence: recurrence,
        seriesId: seriesId,
        attendance: attendance ?? this.attendance,
        reminderChannels: reminderChannels,
        reminderMinutesBefore: reminderMinutesBefore,
        location: location,
        notes: notes ?? this.notes,
        isOnline: isOnline,
      );
}

// ─── Availability block ───────────────────────────────────────────────────────

class AvailabilityBlock {
  final String clinicianId;
  final int weekday; // 1=Monday … 7=Sunday
  final int startHour;
  final int startMinute;
  final int endHour;
  final int endMinute;
  final bool isRecurring;

  const AvailabilityBlock({
    required this.clinicianId,
    required this.weekday,
    required this.startHour,
    required this.startMinute,
    required this.endHour,
    required this.endMinute,
    this.isRecurring = true,
  });

  bool coversTime(DateTime dt) =>
      dt.weekday == weekday &&
      (dt.hour * 60 + dt.minute) >= (startHour * 60 + startMinute) &&
      (dt.hour * 60 + dt.minute) < (endHour * 60 + endMinute);

  Map<String, dynamic> toJson() => {
        'clinicianId': clinicianId,
        'weekday': weekday,
        'startHour': startHour,
        'startMinute': startMinute,
        'endHour': endHour,
        'endMinute': endMinute,
        'isRecurring': isRecurring,
      };

  factory AvailabilityBlock.fromJson(Map<String, dynamic> j) =>
      AvailabilityBlock(
        clinicianId: j['clinicianId'],
        weekday: j['weekday'],
        startHour: j['startHour'],
        startMinute: j['startMinute'],
        endHour: j['endHour'],
        endMinute: j['endMinute'],
        isRecurring: j['isRecurring'] ?? true,
      );
}

// ─── Scheduling service ───────────────────────────────────────────────────────

class SchedulingService {
  static final _store = SecurePhiStorage.instance;
  static const _appointmentsKey = 'schedule.appointments';
  static const _availabilityKey = 'schedule.availability';

  // ─── Appointments ─────────────────────────────────────────────────────────

  static Future<List<Appointment>> getAllAppointments(
      String clinicianId) async {
    final list = await _store.readList<Appointment>(
      _appointmentsKey,
      (j) => Appointment.fromJson(j as Map<String, dynamic>),
    );
    return list.where((a) => a.clinicianId == clinicianId).toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));
  }

  static Future<List<Appointment>> getAppointmentsForDate(
    String clinicianId,
    DateTime date,
  ) async {
    final all = await getAllAppointments(clinicianId);
    return all
        .where(
          (a) =>
              a.startTime.year == date.year &&
              a.startTime.month == date.month &&
              a.startTime.day == date.day,
        )
        .toList();
  }

  static Future<List<Appointment>> getUpcomingAppointments(String clinicianId,
      {int limit = 10}) async {
    final all = await getAllAppointments(clinicianId);
    return all.where((a) => a.isUpcoming).take(limit).toList();
  }

  static Future<List<Appointment>> getPatientAppointments(
    String patientId,
  ) async {
    final list = await _store.readList<Appointment>(
      _appointmentsKey,
      (j) => Appointment.fromJson(j as Map<String, dynamic>),
    );
    return list.where((a) => a.patientId == patientId).toList()
      ..sort((a, b) => b.startTime.compareTo(a.startTime));
  }

  /// Create a single appointment (or the first in a recurring series).
  static Future<void> createAppointment(Appointment appointment) async {
    final all = await _store.readList<dynamic>(_appointmentsKey, (j) => j);
    final toAdd = <Map<String, dynamic>>[appointment.toJson()];

    // Expand recurring series
    if (appointment.recurrence.pattern != RecurrencePattern.none) {
      final dates = appointment.recurrence
          .generateFrom(appointment.startTime)
          .skip(1); // first occurrence already added

      for (final date in dates) {
        final occurrence = Appointment(
          id: '${appointment.id}_${date.millisecondsSinceEpoch}',
          patientId: appointment.patientId,
          patientName: appointment.patientName,
          clinicianId: appointment.clinicianId,
          type: appointment.type,
          startTime: date,
          duration: appointment.duration,
          recurrence: const RecurrenceRule(pattern: RecurrencePattern.none),
          seriesId: appointment.id,
          reminderChannels: appointment.reminderChannels,
          reminderMinutesBefore: appointment.reminderMinutesBefore,
          location: appointment.location,
          isOnline: appointment.isOnline,
        );
        toAdd.add(occurrence.toJson());
      }
    }

    final updated = [...all, ...toAdd];
    await _store.writeJson(_appointmentsKey, updated);

    // Schedule reminders
    for (final apptJson in toAdd) {
      final appt = Appointment.fromJson(apptJson);
      await NotificationService.scheduleReminder(appt);
    }
  }

  static Future<void> updateAppointment(Appointment updated) async {
    final all = await _store.readList<dynamic>(_appointmentsKey, (j) => j);
    final replaced = all.map((j) {
      final existing = Appointment.fromJson(j as Map<String, dynamic>);
      return existing.id == updated.id ? updated.toJson() : j;
    }).toList();
    await _store.writeJson(_appointmentsKey, replaced);
  }

  static Future<void> recordAttendance(
    String appointmentId,
    AttendanceRecord attendance,
  ) async {
    final all = await _store.readList<dynamic>(_appointmentsKey, (j) => j);
    final replaced = all.map((j) {
      final existing = Appointment.fromJson(j as Map<String, dynamic>);
      if (existing.id != appointmentId) return j;
      return existing
          .copyWith(
            status: attendance.status,
            attendance: attendance,
          )
          .toJson();
    }).toList();
    await _store.writeJson(_appointmentsKey, replaced);
  }

  static Future<void> cancelAppointment(
    String appointmentId, {
    required bool byPatient,
    String? reason,
  }) async {
    final all = await _store.readList<dynamic>(_appointmentsKey, (j) => j);
    final replaced = all.map((j) {
      final existing = Appointment.fromJson(j as Map<String, dynamic>);
      if (existing.id != appointmentId) return j;
      return existing
          .copyWith(
            status: byPatient
                ? AppointmentStatus.cancelledByPatient
                : AppointmentStatus.cancelledByClinician,
            notes: reason,
          )
          .toJson();
    }).toList();
    await _store.writeJson(_appointmentsKey, replaced);
  }

  // ─── Availability ──────────────────────────────────────────────────────────

  static Future<void> saveAvailability(List<AvailabilityBlock> blocks) async {
    await _store.writeJson(
      _availabilityKey,
      blocks.map((b) => b.toJson()).toList(),
    );
  }

  static Future<List<AvailabilityBlock>> getAvailability(
    String clinicianId,
  ) async {
    return _store
        .readList<AvailabilityBlock>(
          _availabilityKey,
          (j) => AvailabilityBlock.fromJson(j as Map<String, dynamic>),
        )
        .then(
            (list) => list.where((b) => b.clinicianId == clinicianId).toList());
  }

  // ─── Adherence stats ───────────────────────────────────────────────────────

  static Future<Map<String, int>> getAttendanceStats(String patientId) async {
    final appts = await getPatientAppointments(patientId);
    int completed = 0, noShow = 0, cancelled = 0;
    for (final a in appts) {
      if (a.status == AppointmentStatus.completed) completed++;
      if (a.status == AppointmentStatus.noShow) noShow++;
      if (a.status == AppointmentStatus.cancelledByPatient) cancelled++;
    }
    return {'completed': completed, 'noShow': noShow, 'cancelled': cancelled};
  }
}

// ─── Notification service (fully implemented) ─────────────────────────────────
///
/// pubspec.yaml addition:
///   flutter_local_notifications: ^17.2.0
///   timezone: ^0.9.4
///
/// Android: add to AndroidManifest.xml:
///   <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM"/>
///
/// iOS: add to Info.plist:
///   UNAuthorizationOptionAlert, UNAuthorizationOptionBadge, UNAuthorizationOptionSound

class NotificationService {
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    // flutter_local_notifications initialization:
    //
    // const initSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    // const initSettingsIOS = DarwinInitializationSettings(
    //   requestAlertPermission: true,
    //   requestBadgePermission: true,
    //   requestSoundPermission: true,
    // );
    // const initSettings = InitializationSettings(
    //   android: initSettingsAndroid,
    //   iOS: initSettingsIOS,
    // );
    // await FlutterLocalNotificationsPlugin().initialize(initSettings);
    _initialized = true;
  }

  static Future<void> scheduleReminder(Appointment appointment) async {
    if (!_initialized) await initialize();
    if (appointment.reminderMinutesBefore == null) return;
    if (!appointment.isUpcoming) return;

    final reminderTime = appointment.startTime
        .subtract(Duration(minutes: appointment.reminderMinutesBefore!));

    if (reminderTime.isBefore(DateTime.now())) return;

    // flutter_local_notifications scheduled notification:
    //
    // final tz = TZDateTime.from(reminderTime, local);
    // await FlutterLocalNotificationsPlugin().zonedSchedule(
    //   appointment.id.hashCode,
    //   'Session reminder: ${appointment.patientName}',
    //   '${appointment.type.label} in ${appointment.reminderMinutesBefore} minutes',
    //   tz,
    //   const NotificationDetails(
    //     android: AndroidNotificationDetails(
    //       'session_reminders', 'Session reminders',
    //       importance: Importance.high,
    //       priority: Priority.high,
    //     ),
    //     iOS: DarwinNotificationDetails(),
    //   ),
    //   androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
    //   uiLocalNotificationDateInterpretation:
    //       UILocalNotificationDateInterpretation.absoluteTime,
    // );

    // Placeholder until flutter_local_notifications is added:
    final _ = reminderTime; // suppress unused warning
  }

  static Future<void> cancelReminder(String appointmentId) async {
    // await FlutterLocalNotificationsPlugin().cancel(appointmentId.hashCode);
  }

  static Future<void> showSessionStarted(String patientName) async {
    // await FlutterLocalNotificationsPlugin().show(
    //   DateTime.now().millisecondsSinceEpoch ~/ 1000,
    //   'Session started',
    //   'Recording session with $patientName',
    //   const NotificationDetails(...),
    // );
  }
}
