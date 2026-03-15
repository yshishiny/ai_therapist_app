import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

class RailwayApiClient {
  /// The centralized API connector for the Railway-hosted Python backend.
  static String get _baseUrl => dotenv.env['RAILWAY_BACKEND_URL'] ?? 'http://localhost:8000';

  // --- Patients ---
  static Future<List<dynamic>> getPatients() async {
    final response = await http.get(Uri.parse('$_baseUrl/patients'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load patients');
  }

  static Future<Map<String, dynamic>> createPatient(Map<String, dynamic> patientData) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/patients'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(patientData),
    );
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to create patient: ${response.statusCode}');
  }

  // --- Dashboard ---
  static Future<Map<String, dynamic>> getDashboardStats() async {
    final response = await http.get(Uri.parse('$_baseUrl/dashboard'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load dashboard statistics');
  }

  // --- Assessments ---
  static Future<Map<String, dynamic>> submitAssessment({
    required String patientId,
    required String templateId,
    required Map<String, dynamic> rawAnswers,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/assessments'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        "patient_id": patientId,
        "template_id": templateId,
        "raw_answers": rawAnswers
      }),
    );
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to submit assessment: ${response.statusCode}');
  }
}
