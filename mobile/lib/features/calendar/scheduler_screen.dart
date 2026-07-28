import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';

class SchedulerScreen extends StatefulWidget {
  const SchedulerScreen({super.key});

  @override
  State<SchedulerScreen> createState() => _SchedulerScreenState();
}

class _SchedulerScreenState extends State<SchedulerScreen> {
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = true;
  String? _error;
  List<_AppointmentItem> _appointments = [];
  List<_PatientOption> _patients = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final patientsResp = await ApiClient.instance.get('/patients');
      final appointmentsResp = await ApiClient.instance.get('/appointments');

      if (patientsResp.statusCode != 200 || appointmentsResp.statusCode != 200) {
        throw const ApiException(500, 'Failed to load scheduling data.');
      }

      // GET /patients returns {items, total, limit, offset}; listItems() also
      // accepts the bare array older backends return.
      final patientList = listItems(jsonDecode(patientsResp.body))
          .map((e) => _PatientOption.fromJson(e as Map<String, dynamic>))
          .toList();
      final patientMap = {for (final patient in patientList) patient.id: patient.name};

      final appointmentList = (jsonDecode(appointmentsResp.body) as List<dynamic>)
          .map(
            (e) => _AppointmentItem.fromJson(
              e as Map<String, dynamic>,
              patientMap[e['patient_id'] as String] ?? 'Unknown patient',
            ),
          )
          .toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));

      if (!mounted) return;
      setState(() {
        _patients = patientList;
        _appointments = appointmentList;
        _isLoading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Unable to load appointments right now.';
        _isLoading = false;
      });
    }
  }

  Future<void> _scheduleAppointment() async {
    if (_patients.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add a patient first before scheduling.')),
      );
      return;
    }

    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _ScheduleAppointmentSheet(
        patients: _patients,
        initialDate: _selectedDate,
      ),
    );

    if (created == true) {
      await _loadData();
    }
  }

  Future<void> _updateStatus(_AppointmentItem appointment, String status) async {
    try {
      final response = await ApiClient.instance.patch(
        '/appointments/${appointment.id}?new_status=$status',
      );
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(response.statusCode, 'Failed to update appointment.');
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Appointment marked as $status.')),
      );
      await _loadData();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: Colors.red),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to update appointment status.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final appointmentsForDay = _appointments
        .where((appointment) => appointment.isOnDate(_selectedDate))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text('Session Scheduler', style: GoogleFonts.inter()),
        actions: [
          IconButton(
            icon: const Icon(Icons.today),
            onPressed: () => setState(() => _selectedDate = DateTime.now()),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildCalendarStrip(Theme.of(context)),
          Expanded(child: _buildBody(appointmentsForDay)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _scheduleAppointment,
        icon: const Icon(Icons.add_alarm),
        label: const Text('Schedule'),
      ),
    );
  }

  Widget _buildBody(List<_AppointmentItem> appointmentsForDay) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF8FB9A8)),
      );
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _loadData, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Appointments for ${DateFormat.yMMMd().format(_selectedDate)}',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${appointmentsForDay.length} scheduled',
            style: const TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 16),
          if (appointmentsForDay.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: const Column(
                children: [
                  Icon(Icons.event_available, size: 40, color: Color(0xFF8FB9A8)),
                  SizedBox(height: 12),
                  Text('No appointments on this day yet.'),
                ],
              ),
            )
          else
            ...appointmentsForDay.map(_buildSessionCard),
        ],
      ),
    );
  }

  Widget _buildCalendarStrip(ThemeData theme) {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        itemCount: 14,
        itemBuilder: (context, index) {
          final date = DateTime.now().add(Duration(days: index));
          final isSelected = _sameDate(date, _selectedDate);

          return GestureDetector(
            onTap: () => setState(() => _selectedDate = date),
            child: Container(
              width: 65,
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: isSelected ? theme.primaryColor : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isSelected ? theme.primaryColor : Colors.grey.shade200,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    DateFormat('EEE').format(date),
                    style: TextStyle(
                      color: isSelected ? Colors.white : Colors.grey,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${date.day}',
                    style: GoogleFonts.inter(
                      color: isSelected ? Colors.white : Colors.black87,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSessionCard(_AppointmentItem appointment) {
    final color = appointment.statusColor;
    final start = DateFormat('hh:mm a').format(appointment.startTime);
    final end = DateFormat('hh:mm a').format(appointment.endTime);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border(left: BorderSide(color: color, width: 4)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Text(
                DateFormat('hh:mm').format(appointment.startTime),
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              Text(
                DateFormat('a').format(appointment.startTime),
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Container(width: 1, height: 52, color: Colors.grey.shade200),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  appointment.patientName,
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$start - $end',
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
                const SizedBox(height: 4),
                Text(
                  appointment.locationLabel,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    appointment.statusLabel,
                    style: TextStyle(
                      color: color,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.grey),
            onSelected: (value) => _updateStatus(appointment, value),
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'COMPLETED', child: Text('Mark completed')),
              PopupMenuItem(value: 'NO_SHOW', child: Text('Mark no-show')),
              PopupMenuItem(value: 'CANCELLED', child: Text('Cancel')),
            ],
          ),
        ],
      ),
    );
  }

  bool _sameDate(DateTime left, DateTime right) {
    return left.year == right.year &&
        left.month == right.month &&
        left.day == right.day;
  }
}

class _ScheduleAppointmentSheet extends StatefulWidget {
  final List<_PatientOption> patients;
  final DateTime initialDate;

  const _ScheduleAppointmentSheet({
    required this.patients,
    required this.initialDate,
  });

  @override
  State<_ScheduleAppointmentSheet> createState() =>
      _ScheduleAppointmentSheetState();
}

class _ScheduleAppointmentSheetState extends State<_ScheduleAppointmentSheet> {
  final _formKey = GlobalKey<FormState>();
  final _locationController = TextEditingController(text: 'IN_PERSON');
  final _meetingLinkController = TextEditingController();
  bool _isSaving = false;
  late String _patientId;
  late DateTime _date;
  TimeOfDay _time = TimeOfDay.now();
  int _durationMinutes = 60;
  bool _isTelehealth = false;

  @override
  void initState() {
    super.initState();
    _patientId = widget.patients.first.id;
    _date = widget.initialDate;
  }

  @override
  void dispose() {
    _locationController.dispose();
    _meetingLinkController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _date = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(context: context, initialTime: _time);
    if (picked != null) {
      setState(() => _time = picked);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final start = DateTime(
        _date.year,
        _date.month,
        _date.day,
        _time.hour,
        _time.minute,
      );
      final end = start.add(Duration(minutes: _durationMinutes));

      final response = await ApiClient.instance.post(
        '/appointments',
        body: {
          'patient_id': _patientId,
          'start_time': start.toUtc().toIso8601String(),
          'end_time': end.toUtc().toIso8601String(),
          'location': _isTelehealth
              ? 'ONLINE'
              : _locationController.text.trim().isEmpty
                  ? 'IN_PERSON'
                  : _locationController.text.trim(),
          'meeting_link': _isTelehealth &&
                  _meetingLinkController.text.trim().isNotEmpty
              ? _meetingLinkController.text.trim()
              : null,
        },
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(response.statusCode, 'Failed to create appointment.');
      }

      if (!mounted) return;
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: Colors.red),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to schedule appointment.'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 8,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Schedule appointment',
                style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _patientId,
                decoration: const InputDecoration(labelText: 'Patient'),
                items: widget.patients
                    .map(
                      (patient) => DropdownMenuItem(
                        value: patient.id,
                        child: Text(patient.name),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _patientId = value);
                  }
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickDate,
                      icon: const Icon(Icons.calendar_today),
                      label: Text(DateFormat.yMMMd().format(_date)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickTime,
                      icon: const Icon(Icons.schedule),
                      label: Text(_time.format(context)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                initialValue: _durationMinutes,
                decoration: const InputDecoration(labelText: 'Duration'),
                items: const [
                  DropdownMenuItem(value: 30, child: Text('30 minutes')),
                  DropdownMenuItem(value: 45, child: Text('45 minutes')),
                  DropdownMenuItem(value: 60, child: Text('60 minutes')),
                  DropdownMenuItem(value: 90, child: Text('90 minutes')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _durationMinutes = value);
                  }
                },
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Telehealth session'),
                value: _isTelehealth,
                onChanged: (value) {
                  setState(() {
                    _isTelehealth = value;
                    if (_isTelehealth) {
                      _locationController.text = 'ONLINE';
                    } else {
                      _locationController.text = 'IN_PERSON';
                    }
                  });
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _locationController,
                decoration: InputDecoration(
                  labelText: _isTelehealth ? 'Session label' : 'Location / room',
                ),
                validator: (value) {
                  if (!_isTelehealth && (value == null || value.trim().isEmpty)) {
                    return 'Please enter a location.';
                  }
                  return null;
                },
              ),
              if (_isTelehealth) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _meetingLinkController,
                  decoration: const InputDecoration(
                    labelText: 'Meeting link (optional)',
                  ),
                ),
              ],
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _save,
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Create appointment'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AppointmentItem {
  final String id;
  final String patientId;
  final String patientName;
  final DateTime startTime;
  final DateTime endTime;
  final String location;
  final String status;
  final String? meetingLink;

  const _AppointmentItem({
    required this.id,
    required this.patientId,
    required this.patientName,
    required this.startTime,
    required this.endTime,
    required this.location,
    required this.status,
    required this.meetingLink,
  });

  factory _AppointmentItem.fromJson(
    Map<String, dynamic> json,
    String patientName,
  ) {
    return _AppointmentItem(
      id: json['id'] as String,
      patientId: json['patient_id'] as String,
      patientName: patientName,
      startTime: DateTime.parse(json['start_time'] as String).toLocal(),
      endTime: DateTime.parse(json['end_time'] as String).toLocal(),
      location: json['location'] as String? ?? 'IN_PERSON',
      status: json['status'] as String? ?? 'SCHEDULED',
      meetingLink: json['meeting_link'] as String?,
    );
  }

  bool isOnDate(DateTime date) {
    return startTime.year == date.year &&
        startTime.month == date.month &&
        startTime.day == date.day;
  }

  String get statusLabel => status.replaceAll('_', ' ');

  String get locationLabel {
    if ((meetingLink ?? '').isNotEmpty) {
      return 'Telehealth';
    }
    return location == 'IN_PERSON' ? 'In person' : location;
  }

  Color get statusColor {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return Colors.green;
      case 'NO_SHOW':
        return Colors.orange;
      case 'CANCELLED':
        return Colors.red;
      default:
        return const Color(0xFF8FB9A8);
    }
  }
}

class _PatientOption {
  final String id;
  final String name;

  const _PatientOption({
    required this.id,
    required this.name,
  });

  factory _PatientOption.fromJson(Map<String, dynamic> json) {
    return _PatientOption(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}
