import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

// --- Response Models ---

class SessionThemes {
  final List<String> coreBeliefs;
  final List<String> distortions;
  final List<String> avoidance;
  final List<String> valuesConflicts;
  final List<String> protectiveFactors;

  SessionThemes({
    required this.coreBeliefs,
    required this.distortions,
    required this.avoidance,
    required this.valuesConflicts,
    required this.protectiveFactors,
  });

  factory SessionThemes.fromJson(Map<String, dynamic> json) {
    return SessionThemes(
      coreBeliefs: List<String>.from(json['coreBeliefs'] ?? []),
      distortions: List<String>.from(json['distortions'] ?? []),
      avoidance: List<String>.from(json['avoidance'] ?? []),
      valuesConflicts: List<String>.from(json['valuesConflicts'] ?? []),
      protectiveFactors: List<String>.from(json['protectiveFactors'] ?? []),
    );
  }
}

class NextFocusSuggestion {
  final String primaryFocus;
  final String rationale;
  final List<String> questionsToExplore;

  NextFocusSuggestion({
    required this.primaryFocus,
    required this.rationale,
    required this.questionsToExplore,
  });

  factory NextFocusSuggestion.fromJson(Map<String, dynamic> json) {
    return NextFocusSuggestion(
      primaryFocus: json['primaryFocus'] ?? '',
      rationale: json['rationale'] ?? '',
      questionsToExplore: List<String>.from(json['questionsToExplore'] ?? []),
    );
  }
}

class HomeworkProposal {
  final String title;
  final String description;
  final String difficulty; // Easy, Medium, Hard
  final String frequency; // Daily, Weekly, Once
  final String rationale;

  HomeworkProposal({
    required this.title,
    required this.description,
    required this.difficulty,
    required this.frequency,
    required this.rationale,
  });

  factory HomeworkProposal.fromJson(Map<String, dynamic> json) {
    return HomeworkProposal(
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      difficulty: json['difficulty'] ?? 'Medium',
      frequency: json['frequency'] ?? 'Weekly',
      rationale: json['rationale'] ?? '',
    );
  }
}

class RiskFlag {
  final String category;
  final String severity; // Low, Medium, High, Critical
  final String exactQuote;
  final String rationale;
  final List<String> followUpQuestions;

  RiskFlag({
    required this.category,
    required this.severity,
    required this.exactQuote,
    required this.rationale,
    required this.followUpQuestions,
  });

  factory RiskFlag.fromJson(Map<String, dynamic> json) {
    return RiskFlag(
      category: json['category'] ?? 'Unknown',
      severity: json['severity'] ?? 'Low',
      exactQuote: json['exactQuote'] ?? '',
      rationale: json['rationale'] ?? '',
      followUpQuestions: List<String>.from(json['followUpQuestions'] ?? []),
    );
  }
}

class HealingPlanPhase {
  final String phaseName;
  final List<String> techniques;
  final List<String> homework;
  final List<String> measures;
  final List<String> exitCriteria;

  HealingPlanPhase({
    required this.phaseName,
    required this.techniques,
    required this.homework,
    required this.measures,
    required this.exitCriteria,
  });

  factory HealingPlanPhase.fromJson(Map<String, dynamic> json) {
    return HealingPlanPhase(
      phaseName: json['phaseName'] ?? '',
      techniques: List<String>.from(json['techniques'] ?? []),
      homework: List<String>.from(json['homework'] ?? []),
      measures: List<String>.from(json['measures'] ?? []),
      exitCriteria: List<String>.from(json['exitCriteria'] ?? []),
    );
  }
}

class HealingPlan {
  final String overview;
  final List<HealingPlanPhase> phases;

  HealingPlan({
    required this.overview,
    required this.phases,
  });

  factory HealingPlan.fromJson(Map<String, dynamic> json) {
    return HealingPlan(
      overview: json['overview'] ?? '',
      phases: (json['phases'] as List?)?.map((p) => HealingPlanPhase.fromJson(p)).toList() ?? [],
    );
  }
}


// --- Main AI Service ---

class AiService {
  String get _baseUrl => dotenv.env['AI_GATEWAY_URL'] ?? 'http://localhost:5051/chat';

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

  /// Extracts the first JSON object or array from the AI's plain-text/markdown response.
  dynamic _extractJson(String responseText) {
    try {
      // Find JSON block intelligently ignoring markdown or extra text.
      // Matches both {} and [] containing blocks.
      final jsonRegExp = RegExp(r'(\{[\s\S]*\}|\[[\s\S]*\])');
      final match = jsonRegExp.firstMatch(responseText);
      
      if (match != null) {
        final cleanJson = match.group(0)!;
        return jsonDecode(cleanJson);
      }
      throw const FormatException("No JSON object found in response");
    } catch (e) {
      throw FormatException("Failed to parse JSON: $e\nOriginal Response: $responseText");
    }
  }

  // --- R1 Methods (Kept for backwards compatibility) ---

  Future<String> generateScribeSummary(String transcript) async {
    final prompt = "Role: Expert Clinical Scribe. Summarize this session transcript concisely: $transcript";
    return await _callAi(prompt);
  }

  Future<Map<String, String>> draftSoapNote(String transcript) async {
    final prompt = "Transform this session transcript into a professional SOAP note. Return as JSON with keys: subjective, objective, assessment, plan. Transcript: $transcript";
    final result = await _callAi(prompt);
    
    try {
      final mapped = _extractJson(result) as Map<String, dynamic>;
      return mapped.map((key, value) => MapEntry(key, value.toString()));
    } catch (e) {
      return {
        'subjective': 'Error parsing AI output.',
        'objective': 'Error details: $e',
        'assessment': '...',
        'plan': '...',
      };
    }
  }

  // --- R2 Methods ---

  Future<SessionThemes> extractThemes(String transcript) async {
    final prompt = '''
    Role: Expert Clinical Psychologist.
    Analyze this transcript and extract clinical themes.
    Return strictly as JSON with these keys containing arrays of strings:
    {
      "coreBeliefs": [],
      "distortions": [],
      "avoidance": [],
      "valuesConflicts": [],
      "protectiveFactors": []
    }
    Transcript: $transcript
    ''';
    
    final result = await _callAi(prompt);
    try {
      return SessionThemes.fromJson(_extractJson(result));
    } catch (e) {
      // Return empty/fallback object on parse error
      return SessionThemes(coreBeliefs: [], distortions: [], avoidance: [], valuesConflicts: [], protectiveFactors: []);
    }
  }

  Future<NextFocusSuggestion> suggestNextFocus(String transcript, String previousFocus) async {
    final prompt = '''
    Role: Clinical Supervisor.
    Based on the session transcript and the previous focus ("$previousFocus"), suggest the primary clinical focus for the next session.
    Return strictly as JSON with keys:
    {
      "primaryFocus": "String",
      "rationale": "String",
      "questionsToExplore": ["String", "String", "String"]
    }
    Transcript: $transcript
    ''';

    final result = await _callAi(prompt);
    try {
      return NextFocusSuggestion.fromJson(_extractJson(result));
    } catch (e) {
      return NextFocusSuggestion(primaryFocus: 'Parsing Error', rationale: '$e', questionsToExplore: []);
    }
  }

  Future<List<HomeworkProposal>> proposeHomework(String patientContext) async {
    final prompt = '''
    Role: CBT Therapist.
    Based on this patient context, propose 3 distinct homework assignments.
    Return strictly as a JSON array of objects with keys:
    [
      {
        "title": "String",
        "description": "String",
        "difficulty": "Easy/Medium/Hard",
        "frequency": "Daily/Weekly/Once",
        "rationale": "String"
      }
    ]
    Patient Context: $patientContext
    ''';

    final result = await _callAi(prompt);
    try {
      final List<dynamic> list = _extractJson(result);
      return list.map((e) => HomeworkProposal.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<RiskFlag>> flagRiskLanguage(String transcript) async {
    final prompt = '''
    Role: Clinical Risk Assessor.
    Scan this transcript for markers of self-harm, suicide, violence, or severe neglect.
    Return strictly as a JSON array of objects. Return an empty array [] if no risks are found.
    [
      {
        "category": "String",
        "severity": "Low/Medium/High/Critical",
        "exactQuote": "String",
        "rationale": "String",
        "followUpQuestions": ["String", "String"]
      }
    ]
    Transcript: $transcript
    ''';

    final result = await _callAi(prompt);
    try {
      final List<dynamic> list = _extractJson(result);
      return list.map((e) => RiskFlag.fromJson(e)).toList();
    } catch (e) {
      // In case of error or no json array found, fail safely by saying parsing error.
      return [];
    }
  }

  Future<HealingPlan> generateHealingPlan(String patientDataJson) async {
    final prompt = '''
    Role: Master Clinician defining a long-term treatment plan.
    Based on the following patient profile and history, generate a comprehensive 3-phase healing plan.
    Return strictly as JSON:
    {
      "overview": "String",
      "phases": [
        {
          "phaseName": "String",
          "techniques": ["String"],
          "homework": ["String"],
          "measures": ["String"],
          "exitCriteria": ["String"]
        }
      ]
    }
    Patient Data: $patientDataJson
    ''';

    final result = await _callAi(prompt);
    try {
      return HealingPlan.fromJson(_extractJson(result));
    } catch (e) {
      return HealingPlan(overview: 'Generation Failed: $e', phases: []);
    }
  }
}
