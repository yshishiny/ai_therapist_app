import 'package:flutter/material.dart';

class ClinicalAssessment {
  final String id;
  final String code;
  final String title;
  final String subtitle;
  final String category;
  final String contentMeta;
  final Color color;
  final List<String> questions;
  final List<String> options;

  const ClinicalAssessment({
    required this.id,
    required this.code,
    required this.title,
    required this.subtitle,
    required this.category,
    required this.contentMeta,
    required this.color,
    required this.questions,
    required this.options,
  });
}

class AssessmentData {
  static const List<String> standardOptions = [
    'Not at all',
    'Several days',
    'More than half the days',
    'Nearly every day'
  ];

  static const List<String> yesNoOptions = ['Yes', 'No'];

  static List<ClinicalAssessment> allAssessments = [
    // --- DEPRESSION ---
    const ClinicalAssessment(
      id: 'phq9',
      code: 'PHQ-9',
      title: 'Patient Health Questionnaire-9',
      subtitle: 'Depression Severity',
      category: 'Mood',
      contentMeta: '9 Questions',
      color: Color(0xFF6C63FF),
      questions: [
        'Little interest or pleasure in doing things',
        'Feeling down, depressed, or hopeless',
        'Trouble falling or staying asleep, or sleeping too much',
        'Feeling tired or having little energy',
        'Poor appetite or overeating',
        'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
        'Trouble concentrating on things, such as reading the newspaper or watching television',
        'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual',
        'Thoughts that you would be better off dead or of hurting yourself in some way'
      ],
      options: standardOptions,
    ),
    const ClinicalAssessment(
      id: 'gds',
      code: 'GDS',
      title: 'Geriatric Depression Scale',
      subtitle: 'Depression in Older Adults',
      category: 'Mood',
      contentMeta: '15 Questions (Short Form)',
      color: Color(0xFF5C6BC0),
      questions: [
        'Are you basically satisfied with your life?',
        'Have you dropped many of your activities and interests?',
        'Do you feel that your life is empty?',
        'Do you often get bored?',
        'Are you in good spirits most of the time?',
        'Are you afraid that something bad is going to happen to you?',
        'Do you feel happy most of the time?',
        'Do you often feel helpless?',
        'Do you prefer to stay at home, rather than going out and doing new things?',
        'Do you feel you have more problems with memory than most?',
        'Do you think it is wonderful to be alive now?',
        'Do you feel pretty worthless the way you are now?',
        'Do you feel full of energy?',
        'Do you feel that your situation is hopeless?',
        'Do you think that most people are better off than you are?'
      ],
      options: yesNoOptions,
    ),

    // --- ANXIETY ---
    const ClinicalAssessment(
      id: 'gad7',
      code: 'GAD-7',
      title: 'Generalized Anxiety Disorder-7',
      subtitle: 'Anxiety Severity',
      category: 'Anxiety',
      contentMeta: '7 Questions',
      color: Color(0xFF00BFA5),
      questions: [
        'Feeling nervous, anxious, or on edge',
        'Not being able to stop or control worrying',
        'Worrying too much about different things',
        'Trouble relaxing',
        'Being so restless that it is hard to sit still',
        'Becoming easily annoyed or irritable',
        'Feeling afraid as if something awful might happen'
      ],
      options: standardOptions,
    ),
    const ClinicalAssessment(
      id: 'pcl5',
      code: 'PCL-5',
      title: 'PTSD Checklist for DSM-5',
      subtitle: 'Trauma Symptoms',
      category: 'Trauma',
      contentMeta: '20 Questions',
      color: Color(0xFFFF6584),
      questions: [
        'Repeated, disturbing, and unwanted memories of the stressful experience?',
        'Repeated, disturbing dreams of the stressful experience?',
        'Suddenly feeling or acting as if the stressful experience were actually happening again?',
        'Feeling very upset when something reminded you of the stressful experience?',
        'Having strong physical reactions when something reminded you of the stressful experience?',
        'Avoiding memories, thoughts, or feelings related to the stressful experience?',
        'Avoiding external reminders of the stressful experience?',
        'Trouble remembering important parts of the stressful experience?',
        'Having strong negative beliefs about yourself, other people, or the world?',
        'Blaming yourself or someone else for the stressful experience or what happened after it?',
        'Having strong negative feelings such as fear, horror, anger, guilt, or shame?',
        'Loss of interest in activities that you used to enjoy?',
        'Feeling distant or cut off from other people?',
        'Trouble experiencing positive feelings?',
        'Irritable behavior, angry outbursts, or acting aggressively?',
        'Taking too many risks or doing things that could cause you harm?',
        'Being "superalert" or watchful or on guard?',
        'Feeling jumpy or easily startled?',
        'Having difficulty concentrating?',
        'Trouble falling or staying asleep?'
      ],
      options: [
        'Not at all',
        'A little bit',
        'Moderately',
        'Quite a bit',
        'Extremely'
      ],
    ),

    // --- SUBSTANCE USE ---
    const ClinicalAssessment(
      id: 'audit',
      code: 'AUDIT',
      title: 'Alcohol Use Disorders Identification Test',
      subtitle: 'Alcohol Screening',
      category: 'Substance Use',
      contentMeta: '10 Questions',
      color: Color(0xFFFFD740),
      questions: [
        'How often do you have a drink containing alcohol?',
        'How many drinks containing alcohol do you have on a typical day when you are drinking?',
        'How often do you have six or more drinks on one occasion?',
        'How often during the last year have you found that you were not able to stop drinking once you had started?',
        'How often during the last year have you failed to do what was normally expected of you because of drinking?',
        'How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?',
        'How often during the last year have you had a feeling of guilt or remorse after drinking?',
        'How often during the last year have you been unable to remember what happened the night before because of your drinking?',
        'Have you or someone else been injured because of your drinking?',
        'Has a relative, friend, doctor, or other health care worker been concerned about your drinking or suggested you cut down?'
      ],
      options: [
        'Never',
        'Monthly or less',
        '2-4 times a month',
        '2-3 times a week',
        '4 or more times a week'
      ],
      // Note: AUDIT options vary by question in reality, simplifying for UI demo or would need dynamic options support
    ),

    // --- SLEEP ---
    const ClinicalAssessment(
      id: 'isi',
      code: 'ISI',
      title: 'Insomnia Severity Index',
      subtitle: 'Sleep Quality',
      category: 'Sleep',
      contentMeta: '7 Questions',
      color: Color(0xFF42A5F5),
      questions: [
        'Difficulty falling asleep',
        'Difficulty staying asleep',
        'Problems waking up too early',
        'How satisfied/dissatisfied are you with your CURRENT sleep pattern?',
        'How NOTICEABLE to others do you think your sleep problem is in terms of impairing the quality of your life or organization?',
        'How WORRIED/DISTRESSED are you about your current sleep problem?',
        'To what extent do you consider your sleep problem to INTERFERE with your daily functioning?'
      ],
      options: ['None', 'Mild', 'Moderate', 'Severe', 'Very Severe'],
    ),

    // --- MANIA ---
    const ClinicalAssessment(
      id: 'mdq',
      code: 'MDQ',
      title: 'Mood Disorder Questionnaire',
      subtitle: 'Bipolar Screening',
      category: 'Mood',
      contentMeta: '13 Questions',
      color: Color(0xFFAB47BC),
      questions: [
        'Has there ever been a period of time when you were not your usual self and you felt so good or so hyper that other people thought you were not your normal self?',
        '...you were so irritable that you shouted at people or started fights or arguments?',
        '...you felt much more self-confident than usual?',
        '...you got much less sleep than usual and found you didn’t really miss it?',
        '...you were much more talkative or spoke much faster than usual?',
        '...thoughts raced through your head or you couldn’t slow your mind down?',
        '...you were so easily distracted by things around you that you had trouble concentrating or staying on track?',
        '...you had much more energy than usual?',
        '...you were much more active or did many more things than usual?',
        '...you were much more social or outgoing than usual, for example, you telephoned friends in the middle of the night?',
        '...you were much more interested in sex than usual?',
        '...you did things that were unusual for you or that other people might have thought were excessive, foolish, or risky?',
        '...spending money got you or your family into trouble?'
      ],
      options: yesNoOptions,
    ),
  ];
}
