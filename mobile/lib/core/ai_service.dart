import 'dart:convert';
import 'package:http/http.dart' as http;

class AiService {
  static const String _aiGatewayUrl = String.fromEnvironment(
    'AI_GATEWAY_URL',
    defaultValue: 'http://localhost:5051/chat',
  );
  String get _baseUrl => _aiGatewayUrl;

  Future<String> _callAi(String prompt) async {
    try {
      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'messages': [
            {'role': 'user', 'content': prompt}
          ],
          'temperature': 0.7,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['choices'][0]['message']['content'];
      }
      return "Error: ${response.statusCode}";
    } catch (e) {
      return "Local AI Gateway not reachable: $e";
    }
  }

  Future<String> generateScribeSummary(String transcript) async {
    final prompt = "Role: Expert Clinical Scribe. Summarize this session transcript concisely: $transcript";
    return await _callAi(prompt);
  }

  Future<Map<String, String>> draftSoapNote(String transcript) async {
    final prompt = "Transform this session transcript into a professional SOAP note. Return as JSON with keys: subjective, objective, assessment, plan. Transcript: $transcript";
    final result = await _callAi(prompt);
    
    try {
      // Find JSON block intelligently ignoring markdown or extra text
      final jsonRegExp = RegExp(r'\{[\s\S]*\}');
      final match = jsonRegExp.firstMatch(result);
      
      if (match != null) {
        final cleanJson = match.group(0)!;
        final Map<String, dynamic> map = jsonDecode(cleanJson);
        return map.map((key, value) => MapEntry(key, value.toString()));
      }
      
      throw const FormatException("No JSON object found in response");
    } catch (e) {
      return {
        'subjective': 'Error parsing AI output. Plain text: $result',
        'objective': '...',
        'assessment': '...',
        'plan': '...',
      };
    }
  }

  Future<List<String>> recommendInterventions(String patientContext) async {
    final prompt = "Based on this patient context, list 3 clinical interventions separated by commas: $patientContext";
    final result = await _callAi(prompt);
    return result.split(',').map((e) => e.trim()).toList();
  }
}
