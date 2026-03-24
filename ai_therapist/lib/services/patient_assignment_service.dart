library;

import '../core/api_client.dart';

class PatientAssignmentService {
  Future<Map<String, dynamic>> assignPatient({
    required String patientId,
    required String clinicianId,
    bool isPrimary = true,
  }) {
    return ApiClient.instance.postJsonMap(
      '/admin/patient-assignments',
      body: {
        'patient_id': patientId,
        'clinician_id': clinicianId,
        'is_primary': isPrimary,
      },
    );
  }

  Future<Map<String, dynamic>> updateAssignment({
    required String assignmentId,
    required String status,
    bool? isPrimary,
  }) {
    return ApiClient.instance.patchJsonMap(
      '/admin/patient-assignments/$assignmentId',
      body: {
        'status': status,
        'is_primary': isPrimary,
      },
    );
  }

  Future<void> deleteAssignment(String assignmentId) async {
    final response =
        await ApiClient.instance.delete('/admin/patient-assignments/$assignmentId');
    ApiClient.instance.assertOk(response);
  }

  Future<List<Map<String, dynamic>>> getClinicianPatients(
    String clinicianId,
  ) async {
    final data =
        await ApiClient.instance.getJsonList('/admin/clinicians/$clinicianId/patients');
    return data.cast<Map<String, dynamic>>();
  }

  Future<List<Map<String, dynamic>>> getPatientCareTeam(String patientId) async {
    final data =
        await ApiClient.instance.getJsonList('/admin/patients/$patientId/care-team');
    return data.cast<Map<String, dynamic>>();
  }
}
