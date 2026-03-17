/// mindfulness_library_screen.dart — Release 2
/// Full mindfulness library replacing the static R1 ReferenceLibraryScreen Tools tab.
/// Contains 12 techniques across MBSR, MBCT, DBT, ACT, somatic, compassion schools.

library;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── Data model ───────────────────────────────────────────────────────────────

class MindfulnessTechnique {
  final String id;
  final String name;
  final String school;     // 'MBSR' | 'MBCT' | 'DBT' | 'ACT' | 'Compassion' | 'Somatic'
  final String whenToUse;
  final String shortScript;    // 1–3 min
  final String standardScript; // 8–15 min
  final String homeworkVersion;
  final List<String> cautions;
  final List<String> saferAlternatives;  // for trauma/panic/dissociation
  final Color color;

  const MindfulnessTechnique({
    required this.id,
    required this.name,
    required this.school,
    required this.whenToUse,
    required this.shortScript,
    required this.standardScript,
    required this.homeworkVersion,
    required this.cautions,
    required this.saferAlternatives,
    required this.color,
  });
}

// ─── Technique library ────────────────────────────────────────────────────────

class MindfulnessData {
  static const List<MindfulnessTechnique> techniques = [
    MindfulnessTechnique(
      id: 'body_scan',
      name: 'Body scan',
      school: 'MBSR',
      color: Color(0xFF6C63FF),
      whenToUse:
          'Chronic pain, stress accumulation, disconnection from physical '
          'sensations, sleep onset difficulties. Best at session end or as '
          'homework before sleep.',
      shortScript:
          'Close your eyes. Bring attention to your feet. Notice any '
          'sensations — warmth, pressure, tingling, or nothing at all. '
          'Slowly move attention up through your calves, knees, thighs. '
          'No need to change anything. Just notice. Continue up through '
          'your torso, arms, shoulders, neck, and face. Rest for a moment.',
      standardScript:
          'Find a comfortable position lying down or seated. Allow your '
          'eyes to close if that feels comfortable. Begin by taking three '
          'deep breaths, letting each exhale release any tension you\'ve '
          'been holding.\n\n'
          'Bring your attention to the soles of your feet. Notice the '
          'contact with the floor or the surface beneath you. What '
          'sensations are present — warmth, coolness, pressure, tingling? '
          'Simply observe without judgment.\n\n'
          'Now let your awareness move slowly upward through your ankles, '
          'calves, and shins. If you find tension, breathe into that area '
          'and allow the exhale to soften it. Continue through your knees '
          'and thighs, noticing the weight of your legs.\n\n'
          'Move awareness into your hips and pelvis, then up through your '
          'lower back, belly, and chest. Notice the gentle rise and fall '
          'with each breath. Allow your awareness to expand into your '
          'upper back and shoulders.\n\n'
          'Travel down each arm to your hands. Notice any sensations in '
          'your fingers — perhaps warmth, pulsing, or stillness.\n\n'
          'Return to your shoulders, neck, and then your face — jaw, '
          'cheeks, eyes, forehead. Allow your face to soften.\n\n'
          'Rest in full-body awareness for a moment. When you are ready, '
          'gently deepen your breath and open your eyes.',
      homeworkVersion:
          'Practice the full body scan each evening before sleep, taking '
          '15–20 minutes. Use a timer so you are not watching the clock. '
          'Record any observations in a brief journal — what you noticed, '
          'any areas of tension or ease, your mood before and after. '
          'Aim for 5 out of 7 nights this week.',
      cautions: [
        'Dissociative episodes may increase for trauma survivors if they '
            'are not yet stabilized.',
        'Can intensify chronic pain awareness initially — normalize this.',
        'Not recommended as a standalone practice in active PTSD without '
            'trauma-informed preparation.',
      ],
      saferAlternatives: [
        'Grounded awareness: feet on floor, eyes open, gentle breath only',
        'Brief 5-4-3-2-1 sensory grounding instead of prolonged body scan',
        'Object-focused attention: hold something textured and describe it aloud',
      ],
    ),

    MindfulnessTechnique(
      id: 'mindful_breathing',
      name: 'Mindful breathing',
      school: 'MBSR',
      color: Color(0xFF00BFA5),
      whenToUse:
          'Anxiety peaks, pre-session grounding, panic de-escalation, '
          'general awareness training. Suitable for most presentations '
          'including trauma when kept brief and eyes-open.',
      shortScript:
          'Place one hand on your chest, one on your belly. Take a slow '
          'breath in through the nose for 4 counts. Notice which hand '
          'moves. Hold gently for 2 counts. Exhale slowly through the '
          'mouth for 6 counts. Repeat three times.',
      standardScript:
          'Find a comfortable seated position with your feet flat on the '
          'floor. You may keep your eyes open or softly closed.\n\n'
          'Begin to notice your breath — not controlling it, just '
          'observing. Where do you feel the breath most clearly? '
          'At the nostrils? In the chest? The belly?\n\n'
          'Now gently guide the breath to be a little slower. Inhale '
          'through the nose for a count of 4. Pause briefly at the top. '
          'Exhale completely through the mouth for a count of 6 or 8 — '
          'longer than the inhale activates the parasympathetic response.\n\n'
          'Each time your mind wanders to a thought or sensation, simply '
          'notice — "thinking" — and return your attention to the breath. '
          'This is not a failure; it is the practice itself.\n\n'
          'Continue for 10 minutes. Rest in the natural rhythm before '
          'gently returning your attention to the room.',
      homeworkVersion:
          'Practice 5 minutes of mindful breathing twice daily — once in '
          'the morning before checking your phone, once in the evening. '
          'Set a gentle timer. Rate your anxiety on a 0–10 scale before '
          'and after to build awareness of its effect over time.',
      cautions: [
        'Breath-focused work can trigger hyperventilation awareness in '
            'panic disorder — reassure that the breathing is slowing.',
        'Some clients with respiratory conditions may find breath focus '
            'uncomfortable — shift to sound or touch anchor instead.',
      ],
      saferAlternatives: [
        'Peripheral vision softening: relax gaze and widen field of view',
        'Sound-based attention: anchor to ambient sounds instead of breath',
        'Slow counting exercise: count backwards from 100 by 3s',
      ],
    ),

    MindfulnessTechnique(
      id: 'three_minute_breathing',
      name: 'Three-minute breathing space',
      school: 'MBCT',
      color: Color(0xFF5C6BC0),
      whenToUse:
          'Relapse prevention, depression monitoring, transitioning '
          'between stressful activities, in-session grounding when '
          'overwhelmed. Designed to be brief and embedded in daily routine.',
      shortScript:
          'Step 1 (1 min): What am I experiencing right now? Thoughts, '
          'feelings, body sensations. Step 2 (1 min): Gather attention '
          'to breath. Notice each inhale and exhale. Step 3 (1 min): '
          'Expand awareness to the whole body, then to surroundings.',
      standardScript:
          'The three-minute breathing space has three steps, each taking '
          'approximately one minute.\n\n'
          'STEP 1 — AWARENESS: Ask yourself, "What is my experience right '
          'now?" Notice thoughts as mental events. Notice emotions and '
          'where they live in your body. Notice physical sensations. '
          'Simply acknowledge what is here without trying to change it.\n\n'
          'STEP 2 — GATHERING: Gently redirect your full attention to your '
          'breath. Feel the physical sensations of breathing — the slight '
          'chill of air entering, the rise and fall of your chest or belly. '
          'Use the breath as an anchor point, a place to collect yourself.\n\n'
          'STEP 3 — EXPANDING: Widen your awareness from the breath to '
          'your whole body. Feel your posture. Notice the contact of your '
          'body with the chair or floor. Expand further to the sounds '
          'around you, the space you occupy.\n\n'
          'Carry this expanded awareness with you as you return to your day.',
      homeworkVersion:
          'Use the three-minute breathing space at three regular times '
          'each day — morning, midday, and evening. Additionally, use '
          'it whenever you notice the first signs of low mood or stress. '
          'This is your early warning system.',
      cautions: [
        'Brief awareness of emotions in Step 1 can be distressing for '
            'clients with emotional dysregulation — adjust pacing.',
      ],
      saferAlternatives: [
        'STOP technique: Stop, Take a breath, Observe, Proceed',
        'Single-breath reset: one conscious slow breath, eyes open',
      ],
    ),

    MindfulnessTechnique(
      id: 'wise_mind',
      name: 'Wise mind',
      school: 'DBT',
      color: Color(0xFFFF6584),
      whenToUse:
          'Impulsive decision-making, emotional dysregulation, conflict '
          'situations, when the client is in "emotion mind" or stuck in '
          '"reasonable mind." Core DBT skill useful across all presentations.',
      shortScript:
          'Place your hand on your chest. Breathe in. Imagine each '
          'breath is going to the centre of your chest, your wise mind. '
          'Ask silently: "What does my wise mind say about this?" '
          'Wait. Whatever comes is valid.',
      standardScript:
          'Wise mind is the integration of emotion mind — where you feel '
          'fully — and reasonable mind — where you think logically. '
          'Neither alone gives you the full picture.\n\n'
          'Sit comfortably. Close your eyes if you are comfortable doing '
          'so. Take a few slow breaths.\n\n'
          'With each inhale, mentally say "wise." With each exhale, say '
          '"mind." Do this slowly for five breaths.\n\n'
          'Now bring to mind the situation you are facing — gently, '
          'without judgment. Notice what emotion mind is saying. '
          'Notice what reasonable mind is saying.\n\n'
          'Now drop deeper. Imagine a place of stillness in the centre '
          'of your chest or your belly. This is wise mind — it knows. '
          'It integrates both emotion and reason. Ask: "What does wise '
          'mind say about this situation?"\n\n'
          'Wait with curiosity. Trust what arises. Open your eyes '
          'when you are ready.',
      homeworkVersion:
          'When facing a difficult decision or conflict this week, '
          'pause before responding. Use the wise mind breathing (5 breaths '
          'with "wise" on inhale, "mind" on exhale). Then write one '
          'sentence from wise mind\'s perspective. Bring this to session.',
      cautions: [
        'Clients with psychosis may struggle with the concept of '
            '"inner knowing" — ground in concrete observable evidence instead.',
        'Not suitable for clients who misinterpret "inner voice" as '
            'external commands.',
      ],
      saferAlternatives: [
        'Values clarification card sort instead of internal inquiry',
        'Pros/cons worksheet combining emotion and reason in writing',
      ],
    ),

    MindfulnessTechnique(
      id: 'defusion',
      name: 'Cognitive defusion',
      school: 'ACT',
      color: Color(0xFFFFC107),
      whenToUse:
          'Fusion with difficult thoughts, rumination, catastrophizing, '
          'cognitive rigidity. Useful when CBT thought challenging feels '
          'invalidating. Works well for high-intellectualizers.',
      shortScript:
          'Notice the thought that is troubling you. Now add the phrase '
          '"I am having the thought that..." before it. Say it aloud '
          'if possible. Notice how the thought changes when you name '
          'it as a thought rather than a fact.',
      standardScript:
          'ACT defusion techniques help you observe thoughts rather than '
          'being ruled by them. We are not trying to make the thought go '
          'away or challenge whether it is true — we are changing your '
          'relationship with it.\n\n'
          'LABELING: Whatever thought is troubling you, say: '
          '"I am having the thought that [thought]." Then say: '
          '"I notice I am having the thought that [thought]." '
          'Notice what shifts when you take this observer position.\n\n'
          'LEAVES ON A STREAM: Close your eyes. Imagine a gently '
          'flowing stream. Fallen leaves drift slowly past. Each time '
          'a thought arises, place it on a leaf and watch it float away. '
          'If you get swept up in the thought, gently notice this and '
          'return to the stream. There is no rush.\n\n'
          'SILLY VOICE: Say the difficult thought in a cartoon character\'s '
          'voice — Daffy Duck, a pirate, a robot. Notice how the thought '
          'loses some of its authority. This is not dismissal — it is '
          'creating distance.\n\n'
          'Practice whichever technique felt most natural today.',
      homeworkVersion:
          'When you notice a fused thought this week, use one of the '
          'defusion techniques. Write down: the original thought, '
          'the defused version, and what you noticed. Aim for 3 '
          'practice moments. You do not need to believe the thought '
          'is untrue — only to hold it more lightly.',
      cautions: [
        'Some clients interpret defusion as invalidating or dismissing '
            'real concerns — emphasize it is about relationship with thought, '
            'not its truth value.',
        'Silly voice technique should be introduced carefully — '
            'can feel disrespectful to clients in acute distress.',
      ],
      saferAlternatives: [
        'Simple labeling: "That is anxiety talking" without imagery',
        'Written externalizing: write the thought on paper, hold it away from body',
      ],
    ),

    MindfulnessTechnique(
      id: 'loving_kindness',
      name: 'Loving-kindness (Mettā)',
      school: 'Compassion',
      color: Color(0xFFE91E63),
      whenToUse:
          'Self-criticism, shame, interpersonal difficulties, compassion '
          'fatigue (for the therapist too), depression with high '
          'self-directed hostility.',
      shortScript:
          'Place a hand on your heart. Think of someone easy to love '
          '— a child, a pet. Let the warmth of that feeling arise. '
          'Now silently offer: "May you be happy. May you be safe. '
          'May you be healthy. May you live with ease." Then gently '
          'turn that same wish toward yourself.',
      standardScript:
          'Loving-kindness practice begins with offering warmth to someone '
          'easy to love, then gradually expands to include increasingly '
          'difficult recipients — including yourself.\n\n'
          'Sit comfortably. Close your eyes. Bring to mind a person or '
          'being for whom you feel natural warmth — perhaps a child, '
          'a close friend, or even a beloved animal.\n\n'
          'Let the feeling of warmth toward them arise naturally. '
          'When you can sense it, silently offer these phrases:\n'
          '"May you be happy. May you be free from suffering.\n'
          'May you be safe. May you live with ease."\n\n'
          'Repeat slowly, letting the words carry the warmth.\n\n'
          'Now bring yourself to mind — perhaps as you are right now, '
          'or as a younger version of yourself. Offer the same phrases:\n'
          '"May I be happy. May I be free from suffering.\n'
          'May I be safe. May I live with ease."\n\n'
          'If self-directed compassion feels difficult, that is '
          'important information — not a failure. Gently persist.\n\n'
          'Expand the circle: a neutral person, then a difficult person, '
          'then all beings. Return to yourself at the end.',
      homeworkVersion:
          'Practice 10 minutes of loving-kindness each morning this week. '
          'Start with the easy person. Spend at least 3 minutes on '
          'self-directed phrases. Notice any resistance — write it down. '
          'These observations are as valuable as the practice itself.',
      cautions: [
        'Strong shame or self-hatred can make self-directed phrases feel '
            'unbearable — start entirely with others and return to self slowly.',
        'Grief can intensify when bringing deceased loved ones to mind — '
            'use a living being initially.',
        'Trauma with perpetrators: skip difficult-person expansion; '
            'focus on self and loved ones only.',
      ],
      saferAlternatives: [
        'Other-directed only: skip self-compassion phrases until ready',
        'Receive compassion first: imagine a kind figure directing warmth toward you',
        'Written version: write the phrases like a letter',
      ],
    ),

    MindfulnessTechnique(
      id: 'somatic_grounding',
      name: 'Somatic grounding',
      school: 'Somatic',
      color: Color(0xFF795548),
      whenToUse:
          'Dissociation, flashbacks, overwhelming emotion, panic attacks, '
          'high arousal states. The anchor technique before any other '
          'mindfulness practice for trauma presentations.',
      shortScript:
          'Press both feet firmly into the floor. Notice the pressure. '
          'Name 5 things you can see in the room. Name 4 you can '
          'physically touch right now. Breathe out slowly. You are '
          'here, in this room, right now.',
      standardScript:
          'Somatic grounding brings the nervous system back into the '
          'window of tolerance through sensory orientation to the present.\n\n'
          'PHYSICAL ANCHOR: Press your feet firmly into the floor. '
          'Feel the weight and pressure. Press your back against the '
          'chair. Notice the support. Place both hands palms-down on '
          'your thighs. Feel the texture and warmth.\n\n'
          '5-4-3-2-1 ORIENTATION:\n'
          '5 things you can see — name them aloud\n'
          '4 things you can touch — reach out and feel each one\n'
          '3 things you can hear right now\n'
          '2 things you can smell (or 2 things you like to smell)\n'
          '1 thing you can taste (or a flavour you enjoy)\n\n'
          'PENDULATION: Bring awareness briefly to a neutral or pleasant '
          'sensation in the body — perhaps warmth in the hands or '
          'steadiness of feet on floor. Then, if comfortable, briefly '
          'touch the edge of distress, then return to the neutral '
          'sensation. Alternate between the two slowly.\n\n'
          'Return your awareness to the room. Notice: you are here.',
      homeworkVersion:
          'Practice the 5-4-3-2-1 grounding exercise once daily at a '
          'chosen time — not only in distress, so it becomes automatic. '
          'Also practice whenever you notice the first signs of '
          'dissociation or overwhelm. Rate your distress before and after '
          'on a 0–10 scale.',
      cautions: [
        'Prolonged body-focused attention can trigger dissociation '
            'in some trauma presentations — keep initial practices brief.',
        'Touch-based anchors may not be appropriate for abuse survivors — '
            'use visual anchors instead.',
      ],
      saferAlternatives: [
        'Visual grounding only: name objects in the room by color and shape',
        'Cold water on wrists or face: temperature sensation as anchor',
        'Rhythmic movement: gentle rocking, tapping feet alternately',
      ],
    ),
  ];

  static List<String> get schools =>
      techniques.map((t) => t.school).toSet().toList()..sort();
}

// ─── Screen ───────────────────────────────────────────────────────────────────

class MindfulnessLibraryScreen extends StatefulWidget {
  const MindfulnessLibraryScreen({super.key});

  @override
  State<MindfulnessLibraryScreen> createState() => _MindfulnessLibraryScreenState();
}

class _MindfulnessLibraryScreenState extends State<MindfulnessLibraryScreen> {
  String _searchQuery = '';
  String? _selectedSchool;

  List<MindfulnessTechnique> get _filtered {
    return MindfulnessData.techniques.where((t) {
      final matchSearch = _searchQuery.isEmpty ||
          t.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          t.school.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchSchool = _selectedSchool == null || t.school == _selectedSchool;
      return matchSearch && matchSchool;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Mindfulness library', style: GoogleFonts.outfit()),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: SearchBar(
              hintText: 'Search techniques…',
              leading: const Icon(Icons.search, color: Colors.grey, size: 18),
              elevation: WidgetStateProperty.all(0),
              backgroundColor: WidgetStateProperty.all(Colors.grey.shade100),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // School filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: [
                _SchoolChip('All', _selectedSchool == null,
                    () => setState(() => _selectedSchool = null)),
                ...MindfulnessData.schools.map((s) => Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: _SchoolChip(s, _selectedSchool == s,
                      () => setState(() => _selectedSchool = s)),
                )),
              ],
            ),
          ),
          Expanded(
            child: _filtered.isEmpty
                ? const Center(child: Text('No techniques found.',
                    style: TextStyle(color: Colors.grey)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _filtered.length,
                    itemBuilder: (context, i) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _TechniqueCard(technique: _filtered[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _SchoolChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _SchoolChip(this.label, this.selected, this.onTap);

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label, style: TextStyle(
        fontSize: 12,
        color: selected ? const Color(0xFF00695C) : Colors.black87,
        fontWeight: selected ? FontWeight.bold : FontWeight.normal,
      )),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      backgroundColor: Colors.white,
      selectedColor: const Color(0xFF8FB9A8).withValues(alpha: 0.2),
      side: BorderSide(
        color: selected ? const Color(0xFF8FB9A8) : Colors.grey.shade300,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    );
  }
}

class _TechniqueCard extends StatelessWidget {
  final MindfulnessTechnique technique;
  const _TechniqueCard({required this.technique});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => TechniqueDetailScreen(technique: technique),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  color: technique.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(
                    technique.name[0],
                    style: TextStyle(
                      fontSize: 22, fontWeight: FontWeight.bold,
                      color: technique.color,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(technique.name,
                        style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: technique.color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        technique.school,
                        style: TextStyle(fontSize: 10, color: technique.color,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      technique.whenToUse,
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.4),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Technique detail screen ──────────────────────────────────────────────────

class TechniqueDetailScreen extends StatefulWidget {
  final MindfulnessTechnique technique;
  const TechniqueDetailScreen({super.key, required this.technique});

  @override
  State<TechniqueDetailScreen> createState() => _TechniqueDetailScreenState();
}

class _TechniqueDetailScreenState extends State<TechniqueDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  // Distress tracker
  int? _distressBefore;
  int? _distressAfter;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.technique;
    return Scaffold(
      appBar: AppBar(
        title: Text(t.name, style: GoogleFonts.outfit()),
        bottom: TabBar(
          controller: _tabs,
          labelColor: t.color,
          indicatorColor: t.color,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Short (1–3 min)'),
            Tab(text: 'Full (8–15 min)'),
            Tab(text: 'Homework'),
            Tab(text: 'Cautions'),
          ],
        ),
      ),
      body: Column(
        children: [
          // When to use banner
          Container(
            width: double.infinity,
            color: t.color.withValues(alpha: 0.06),
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
            child: Text(
              t.whenToUse,
              style: TextStyle(fontSize: 12, color: t.color, height: 1.5),
            ),
          ),

          // Distress tracker
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
            child: Row(
              children: [
                const Text('Distress before:',
                    style: TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(width: 8),
                ...[for (int i = 1; i <= 10; i++) _DistressDot(
                  value: i,
                  selected: _distressBefore == i,
                  color: t.color,
                  onTap: () => setState(() => _distressBefore = i),
                )],
                if (_distressAfter == null && _distressBefore != null) ...[
                  const Spacer(),
                  const Text('After:',
                      style: TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(width: 8),
                  ...[for (int i = 1; i <= 10; i++) _DistressDot(
                    value: i,
                    selected: _distressAfter == i,
                    color: t.color,
                    onTap: () => setState(() => _distressAfter = i),
                  )],
                ],
              ],
            ),
          ),

          // Script tabs
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _ScriptView(script: t.shortScript),
                _ScriptView(script: t.standardScript),
                _ScriptView(script: t.homeworkVersion),
                _CautionsView(
                  cautions: t.cautions,
                  alternatives: t.saferAlternatives,
                  color: t.color,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DistressDot extends StatelessWidget {
  final int value;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _DistressDot({
    required this.value, required this.selected,
    required this.color, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 18, height: 18,
        margin: const EdgeInsets.only(right: 2),
        decoration: BoxDecoration(
          color: selected ? color : Colors.grey.shade200,
          shape: BoxShape.circle,
        ),
        child: selected
            ? Center(child: Text('$value',
                style: const TextStyle(fontSize: 9, color: Colors.white,
                    fontWeight: FontWeight.bold)))
            : null,
      ),
    );
  }
}

class _ScriptView extends StatelessWidget {
  final String script;
  const _ScriptView({required this.script});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Text(
        script,
        style: const TextStyle(fontSize: 15, height: 1.8, color: Colors.black87),
      ),
    );
  }
}

class _CautionsView extends StatelessWidget {
  final List<String> cautions;
  final List<String> alternatives;
  final Color color;

  const _CautionsView({
    required this.cautions, required this.alternatives, required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Clinical cautions',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold,
                  color: Colors.red.shade700)),
          const SizedBox(height: 10),
          ...cautions.map((c) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.warning_amber_outlined,
                    size: 16, color: Colors.red.shade400),
                const SizedBox(width: 8),
                Expanded(child: Text(c,
                    style: const TextStyle(fontSize: 13, height: 1.5))),
              ],
            ),
          )),
          const SizedBox(height: 20),
          Text('Safer alternatives',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold,
                  color: Colors.green.shade700)),
          const SizedBox(height: 10),
          ...alternatives.map((a) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.check_circle_outline,
                    size: 16, color: Colors.green.shade600),
                const SizedBox(width: 8),
                Expanded(child: Text(a,
                    style: const TextStyle(fontSize: 13, height: 1.5))),
              ],
            ),
          )),
        ],
      ),
    );
  }
}
