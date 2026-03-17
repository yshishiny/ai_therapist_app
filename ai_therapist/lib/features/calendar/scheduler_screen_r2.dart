import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'scheduling_service.dart';

class SchedulerScreenR2 extends StatefulWidget {
  final String clinicianId;
  final String? prefillPatientId;
  final String? prefillPatientName;

  const SchedulerScreenR2({
    super.key,
    required this.clinicianId,
    this.prefillPatientId,
    this.prefillPatientName,
  });

  @override
  _SchedulerScreenR2State createState() => _SchedulerScreenR2State();
}

class _SchedulerScreenR2State extends State<SchedulerScreenR2> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _patientNameCtrl;
  late TextEditingController _patientIdCtrl;
  late TextEditingController _notesCtrl;
  late TextEditingController _locationCtrl;

  AppointmentType _selectedType = AppointmentType.individual;
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();
  int _durationMinutes = 60;
  bool _isOnline = false;

  RecurrencePattern _recurrencePattern = RecurrencePattern.none;
  int? _recurrenceOccurrences;

  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _patientIdCtrl = TextEditingController(text: widget.prefillPatientId ?? '');
    _patientNameCtrl =
        TextEditingController(text: widget.prefillPatientName ?? '');
    _notesCtrl = TextEditingController();
    _locationCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _patientNameCtrl.dispose();
    _patientIdCtrl.dispose();
    _notesCtrl.dispose();
    _locationCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final dt = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (dt != null) setState(() => _selectedDate = dt);
  }

  Future<void> _pickTime() async {
    final tm = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
    );
    if (tm != null) setState(() => _selectedTime = tm);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final startTime = DateTime(
        _selectedDate.year,
        _selectedDate.month,
        _selectedDate.day,
        _selectedTime.hour,
        _selectedTime.minute,
      );

      final appointment = Appointment(
        id: 'APP_\${DateTime.now().millisecondsSinceEpoch}',
        patientId: _patientIdCtrl.text,
        patientName: _patientNameCtrl.text,
        clinicianId: widget.clinicianId,
        type: _selectedType,
        startTime: startTime,
        duration: Duration(minutes: _durationMinutes),
        recurrence: RecurrenceRule(
          pattern: _recurrencePattern,
          occurrences: _recurrenceOccurrences,
        ),
        location: _locationCtrl.text,
        notes: _notesCtrl.text,
        isOnline: _isOnline,
      );

      await SchedulingService.createAppointment(appointment);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appointment scheduled successfully')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error saving appointment: \$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Schedule Appointment'),
        actions: [
          if (_isSaving)
            const Center(
                child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2)),
            ))
          else
            IconButton(
              icon: const Icon(Icons.check),
              onPressed: _save,
            )
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              _buildSectionHeader('Patient Details'),
              TextFormField(
                controller: _patientNameCtrl,
                decoration: const InputDecoration(
                    labelText: 'Patient Name', border: OutlineInputBorder()),
                validator: (val) =>
                    val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _patientIdCtrl,
                decoration: const InputDecoration(
                    labelText: 'Patient Reference ID',
                    border: OutlineInputBorder()),
                validator: (val) =>
                    val == null || val.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 24),
              _buildSectionHeader('Session Details'),
              DropdownButtonFormField<AppointmentType>(
                initialValue: _selectedType,
                decoration: const InputDecoration(
                    labelText: 'Session Type', border: OutlineInputBorder()),
                items: AppointmentType.values.map((t) {
                  return DropdownMenuItem(value: t, child: Text(t.label));
                }).toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _selectedType = v);
                },
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: _pickDate,
                      child: InputDecorator(
                        decoration: const InputDecoration(
                            labelText: 'Date', border: OutlineInputBorder()),
                        child: Text(DateFormat.yMMMd().format(_selectedDate)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: _pickTime,
                      child: InputDecorator(
                        decoration: const InputDecoration(
                            labelText: 'Time', border: OutlineInputBorder()),
                        child: Text(_selectedTime.format(context)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                initialValue: _durationMinutes,
                decoration: const InputDecoration(
                    labelText: 'Duration', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 30, child: Text('30 Minutes')),
                  DropdownMenuItem(value: 45, child: Text('45 Minutes')),
                  DropdownMenuItem(value: 60, child: Text('60 Minutes')),
                  DropdownMenuItem(value: 90, child: Text('90 Minutes')),
                  DropdownMenuItem(value: 120, child: Text('120 Minutes')),
                ],
                onChanged: (v) {
                  if (v != null) setState(() => _durationMinutes = v);
                },
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                title: const Text('Online / Telehealth'),
                contentPadding: EdgeInsets.zero,
                value: _isOnline,
                onChanged: (v) => setState(() => _isOnline = v),
              ),
              if (!_isOnline) ...[
                const SizedBox(height: 8),
                TextFormField(
                  controller: _locationCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Location / Room',
                      border: OutlineInputBorder()),
                ),
              ],
              const SizedBox(height: 24),
              _buildSectionHeader('Recurrence'),
              DropdownButtonFormField<RecurrencePattern>(
                initialValue: _recurrencePattern,
                decoration: const InputDecoration(
                    labelText: 'Repeat Pattern', border: OutlineInputBorder()),
                items: RecurrencePattern.values.map((p) {
                  return DropdownMenuItem(
                      value: p, child: Text(p.name.toUpperCase()));
                }).toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _recurrencePattern = v);
                },
              ),
              if (_recurrencePattern != RecurrencePattern.none) ...[
                const SizedBox(height: 12),
                TextFormField(
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                      labelText: 'Number of Occurrences (Optional)',
                      border: OutlineInputBorder(),
                      helperText: 'Leave empty to repeat until cancelled'),
                  onChanged: (val) {
                    setState(() {
                      _recurrenceOccurrences = int.tryParse(val);
                    });
                  },
                ),
              ],
              const SizedBox(height: 24),
              _buildSectionHeader('Additional Notes'),
              TextFormField(
                controller: _notesCtrl,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Preparation notes or specific focus areas...',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _isSaving ? null : _save,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Schedule Appointment'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Text(
        title,
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Theme.of(context).primaryColor,
        ),
      ),
    );
  }
}
