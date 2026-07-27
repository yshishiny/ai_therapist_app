"""
add_bilingual_content.py — Add Arabic/English bilingual text to instruments
------------------------------------------------------------------
Convention going forward: every question/instructions/option carries both
`text`/`text_ar`, `instructions`/`instructions_ar`, `label`/`label_ar` --
`text`/`instructions`/`label` are always English, the `_ar` suffix is
always Arabic. Scoring/interpretation/risk rules are untouched (they key
off numeric ids/values, not display text, so they're language-agnostic).

This is a direct UPDATE to each instrument's current published
definition_json (additive only -- no question/scoring semantics change).
Translations are AI-assisted (authored directly, not machine-translated
via a third-party API); flagged in each version's notes for a fluent
clinical reviewer (Dr. Heba) to spot-check before treating as final.

Covers this pass: PHQ-9, GAD-7, WHO-5, PSS-10, AUDIT, PCL-5, GAD-2,
ASRS Part A, SCOFF, DAST-10, RAS (11 real free instruments) + Y-BOCS and
Emotional Intelligence Scale (adding English to the Arabic-native
originals). The 6 originally-authored English instruments (SDI-7, MPI-21,
API-10, CDSS-14, CASS-13, CBI) are deliberately deferred to a follow-up
pass.

Usage:
    DATABASE_URL=postgresql://... python add_bilingual_content.py
"""

from __future__ import annotations

import asyncio
import json
import os

import asyncpg

# ---------------------------------------------------------------------------
# Shared bilingual option sets
# ---------------------------------------------------------------------------

LIKERT_0_3_AR = [
    {"value": 0, "label": "Not at all", "label_ar": "أبداً"},
    {"value": 1, "label": "Several days", "label_ar": "عدة أيام"},
    {"value": 2, "label": "More than half the days", "label_ar": "أكثر من نصف الأيام"},
    {"value": 3, "label": "Nearly every day", "label_ar": "تقريباً كل يوم"},
]

WHO5_OPTIONS_AR = [
    {"value": 0, "label": "At no time", "label_ar": "في أي وقت"},
    {"value": 1, "label": "Some of the time", "label_ar": "بعض الوقت"},
    {"value": 2, "label": "Less than half of the time", "label_ar": "أقل من نصف الوقت"},
    {"value": 3, "label": "More than half of the time", "label_ar": "أكثر من نصف الوقت"},
    {"value": 4, "label": "Most of the time", "label_ar": "معظم الوقت"},
    {"value": 5, "label": "All of the time", "label_ar": "طوال الوقت"},
]

FREQ_0_4_AR = [
    {"value": 0, "label": "Never", "label_ar": "أبداً"},
    {"value": 1, "label": "Almost never", "label_ar": "نادراً"},
    {"value": 2, "label": "Sometimes", "label_ar": "أحياناً"},
    {"value": 3, "label": "Fairly often", "label_ar": "غالباً"},
    {"value": 4, "label": "Very often", "label_ar": "كثيراً جداً"},
]

ASRS_FREQ_AR = [
    {"value": 0, "label": "Never", "label_ar": "أبداً"},
    {"value": 1, "label": "Rarely", "label_ar": "نادراً"},
    {"value": 2, "label": "Sometimes", "label_ar": "أحياناً"},
    {"value": 3, "label": "Often", "label_ar": "غالباً"},
    {"value": 4, "label": "Very often", "label_ar": "كثيراً جداً"},
]

PCL5_OPTIONS_AR = [
    {"value": 0, "label": "Not at all", "label_ar": "أبداً"},
    {"value": 1, "label": "A little bit", "label_ar": "قليلاً"},
    {"value": 2, "label": "Moderately", "label_ar": "بشكل متوسط"},
    {"value": 3, "label": "Quite a bit", "label_ar": "كثيراً"},
    {"value": 4, "label": "Extremely", "label_ar": "بشكل شديد جداً"},
]

YES_NO_AR = [
    {"value": 0, "label": "No", "label_ar": "لا"},
    {"value": 1, "label": "Yes", "label_ar": "نعم"},
]

RAS_SCALE_AR = [
    {"value": 1, "label": "Low / not at all", "label_ar": "منخفض / إطلاقاً"},
    {"value": 2, "label": "Somewhat low", "label_ar": "منخفض إلى حد ما"},
    {"value": 3, "label": "Moderate", "label_ar": "متوسط"},
    {"value": 4, "label": "Somewhat high", "label_ar": "مرتفع إلى حد ما"},
    {"value": 5, "label": "High / very much", "label_ar": "مرتفع / كثيراً جداً"},
]


def q(id_, text, text_ar, options, **extra):
    d = {"id": id_, "text": text, "text_ar": text_ar, "type": "single_choice", "options": options}
    d.update(extra)
    return d


BILINGUAL_UPDATES = {
    "phq9": {
        "instructions": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
        "instructions_ar": "خلال الأسبوعين الماضيين، كم مرة شعرت بالإزعاج من أي من المشاكل التالية؟",
        "questions": [
            q(1, "Little interest or pleasure in doing things", "قلة الاهتمام أو المتعة في القيام بالأشياء", LIKERT_0_3_AR),
            q(2, "Feeling down, depressed, or hopeless", "الشعور بالحزن أو الاكتئاب أو اليأس", LIKERT_0_3_AR),
            q(3, "Trouble falling or staying asleep, or sleeping too much", "صعوبة في النوم أو البقاء نائماً، أو النوم لفترة أطول من اللازم", LIKERT_0_3_AR),
            q(4, "Feeling tired or having little energy", "الشعور بالتعب أو قلة الطاقة", LIKERT_0_3_AR),
            q(5, "Poor appetite or overeating", "ضعف الشهية أو الإفراط في الأكل", LIKERT_0_3_AR),
            q(6, "Feeling bad about yourself — or that you are a failure or have let yourself or your family down", "الشعور بالسوء تجاه نفسك — أو أنك فاشل أو أنك خذلت نفسك أو عائلتك", LIKERT_0_3_AR),
            q(7, "Trouble concentrating on things, such as reading the newspaper or watching television", "صعوبة في التركيز على أشياء مثل قراءة الجريدة أو مشاهدة التلفاز", LIKERT_0_3_AR),
            q(8, "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual", "التحرك أو الكلام ببطء شديد لدرجة أن الآخرين قد لاحظوا ذلك؟ أو العكس — الشعور بتململ أو تحرك أكثر من المعتاد", LIKERT_0_3_AR),
            q(9, "Thoughts that you would be better off dead, or of hurting yourself in some way", "أفكار بأنك ستكون أفضل حالاً لو كنت ميتاً، أو إيذاء نفسك بطريقة ما", LIKERT_0_3_AR),
        ],
    },
    "gad7": {
        "instructions": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
        "instructions_ar": "خلال الأسبوعين الماضيين، كم مرة شعرت بالإزعاج من أي من المشاكل التالية؟",
        "questions": [
            q(1, "Feeling nervous, anxious, or on edge", "الشعور بالعصبية أو القلق أو التوتر", LIKERT_0_3_AR),
            q(2, "Not being able to stop or control worrying", "عدم القدرة على إيقاف القلق أو التحكم فيه", LIKERT_0_3_AR),
            q(3, "Worrying too much about different things", "القلق الزائد بشأن أشياء مختلفة", LIKERT_0_3_AR),
            q(4, "Trouble relaxing", "صعوبة في الاسترخاء", LIKERT_0_3_AR),
            q(5, "Being so restless that it is hard to sit still", "التململ الشديد لدرجة صعوبة الجلوس بهدوء", LIKERT_0_3_AR),
            q(6, "Becoming easily annoyed or irritable", "سرعة الانزعاج أو التهيج", LIKERT_0_3_AR),
            q(7, "Feeling afraid, as if something awful might happen", "الشعور بالخوف وكأن شيئاً فظيعاً قد يحدث", LIKERT_0_3_AR),
        ],
    },
    "gad2": {
        "instructions": "Over the last 2 weeks, how often have you been bothered by the following problems?",
        "instructions_ar": "خلال الأسبوعين الماضيين، كم مرة شعرت بالإزعاج من المشاكل التالية؟",
        "questions": [
            q(1, "Feeling nervous, anxious, or on edge", "الشعور بالعصبية أو القلق أو التوتر", LIKERT_0_3_AR),
            q(2, "Not being able to stop or control worrying", "عدم القدرة على إيقاف القلق أو التحكم فيه", LIKERT_0_3_AR),
        ],
    },
    "who5": {
        "instructions": "Please indicate for each of the five statements which is closest to how you have been feeling over the last two weeks. Higher numbers mean better wellbeing.",
        "instructions_ar": "يرجى الإشارة لكل عبارة من العبارات الخمس التالية إلى الأقرب لما شعرت به خلال الأسبوعين الماضيين.",
        "questions": [
            q(1, "I have felt cheerful and in good spirits", "شعرت بالبهجة وبروح معنوية جيدة", WHO5_OPTIONS_AR),
            q(2, "I have felt calm and relaxed", "شعرت بالهدوء والاسترخاء", WHO5_OPTIONS_AR),
            q(3, "I have felt active and vigorous", "شعرت بالنشاط والحيوية", WHO5_OPTIONS_AR),
            q(4, "I woke up feeling fresh and rested", "استيقظت من النوم وشعرت بالانتعاش والراحة", WHO5_OPTIONS_AR),
            q(5, "My daily life has been filled with things that interest me", "كانت حياتي اليومية مليئة بأشياء تثير اهتمامي", WHO5_OPTIONS_AR),
        ],
    },
    "pss10": {
        "instructions": "In the last month, how often have you felt or thought a certain way?",
        "instructions_ar": "خلال الشهر الماضي، كم مرة شعرت أو فكرت بطريقة معينة؟",
        "options": FREQ_0_4_AR,
        "questions": [
            {"id": 1, "text": "Been upset because of something that happened unexpectedly", "text_ar": "انزعجت بسبب حدوث شيء غير متوقع", "type": "likert", "reverse_scored": False},
            {"id": 2, "text": "Felt that you were unable to control the important things in your life", "text_ar": "شعرت أنك غير قادر على التحكم في الأشياء المهمة في حياتك", "type": "likert", "reverse_scored": False},
            {"id": 3, "text": "Felt nervous and stressed", "text_ar": "شعرت بالعصبية والتوتر", "type": "likert", "reverse_scored": False},
            {"id": 4, "text": "Felt confident about your ability to handle your personal problems", "text_ar": "شعرت بالثقة في قدرتك على التعامل مع مشاكلك الشخصية", "type": "likert", "reverse_scored": True},
            {"id": 5, "text": "Felt that things were going your way", "text_ar": "شعرت أن الأمور تسير كما تريد", "type": "likert", "reverse_scored": True},
            {"id": 6, "text": "Found that you could not cope with all the things that you had to do", "text_ar": "وجدت أنك غير قادر على التأقلم مع كل الأشياء التي كان يجب عليك القيام بها", "type": "likert", "reverse_scored": False},
            {"id": 7, "text": "Been able to control irritations in your life", "text_ar": "كنت قادراً على التحكم في الانزعاجات في حياتك", "type": "likert", "reverse_scored": True},
            {"id": 8, "text": "Felt that you were on top of things", "text_ar": "شعرت أنك مسيطر على الأمور", "type": "likert", "reverse_scored": True},
            {"id": 9, "text": "Been angered because of things that were outside of your control", "text_ar": "غضبت بسبب أمور خارجة عن سيطرتك", "type": "likert", "reverse_scored": False},
            {"id": 10, "text": "Felt difficulties were piling up so high that you could not overcome them", "text_ar": "شعرت أن الصعوبات تتراكم لدرجة أنك لا تستطيع التغلب عليها", "type": "likert", "reverse_scored": False},
        ],
    },
    "audit": {
        "instructions": "Because alcohol use can affect health and can interfere with certain medications and treatments, it is important that we ask some questions about your use of alcohol. Your answers will remain confidential.",
        "instructions_ar": "نظراً لأن تعاطي الكحول يمكن أن يؤثر على الصحة ويتداخل مع بعض الأدوية والعلاجات، من المهم أن نطرح بعض الأسئلة حول تعاطيك للكحول. ستبقى إجاباتك سرية.",
        "questions": [
            q(1, "How often do you have a drink containing alcohol?", "كم مرة تتناول مشروباً يحتوي على الكحول؟",
              [{"value": 0, "label": "Never", "label_ar": "أبداً"}, {"value": 1, "label": "Monthly or less", "label_ar": "شهرياً أو أقل"}, {"value": 2, "label": "2-4 times a month", "label_ar": "2-4 مرات في الشهر"}, {"value": 3, "label": "2-3 times a week", "label_ar": "2-3 مرات في الأسبوع"}, {"value": 4, "label": "4 or more times a week", "label_ar": "4 مرات أو أكثر في الأسبوع"}]),
            q(2, "How many standard drinks containing alcohol do you have on a typical day when you are drinking?", "كم عدد المشروبات القياسية التي تحتوي على الكحول التي تتناولها في اليوم النموذجي عندما تشرب؟",
              [{"value": 0, "label": "1 or 2", "label_ar": "1 أو 2"}, {"value": 1, "label": "3 or 4", "label_ar": "3 أو 4"}, {"value": 2, "label": "5 or 6", "label_ar": "5 أو 6"}, {"value": 3, "label": "7 to 9", "label_ar": "7 إلى 9"}, {"value": 4, "label": "10 or more", "label_ar": "10 أو أكثر"}]),
            q(3, "How often do you have six or more drinks on one occasion?", "كم مرة تتناول ستة مشروبات أو أكثر في مناسبة واحدة؟", FREQ_0_4_AR),
            q(4, "How often during the last year have you found that you were not able to stop drinking once you had started?", "كم مرة خلال العام الماضي وجدت أنك غير قادر على التوقف عن الشرب بمجرد أن تبدأ؟", FREQ_0_4_AR),
            q(5, "How often during the last year have you failed to do what was normally expected of you because of drinking?", "كم مرة خلال العام الماضي فشلت في القيام بما هو متوقع منك عادة بسبب الشرب؟", FREQ_0_4_AR),
            q(6, "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?", "كم مرة خلال العام الماضي احتجت لشرب كأس في الصباح لتبدأ يومك بعد جلسة شرب كبيرة؟", FREQ_0_4_AR),
            q(7, "How often during the last year have you had a feeling of guilt or remorse after drinking?", "كم مرة خلال العام الماضي شعرت بالذنب أو الندم بعد الشرب؟", FREQ_0_4_AR),
            q(8, "How often during the last year have you been unable to remember what happened the night before because you had been drinking?", "كم مرة خلال العام الماضي لم تستطع تذكر ما حدث الليلة السابقة بسبب الشرب؟", FREQ_0_4_AR),
            q(9, "Have you or someone else been injured as a result of your drinking?", "هل أصبت أنت أو شخص آخر نتيجة لشربك؟",
              [{"value": 0, "label": "No", "label_ar": "لا"}, {"value": 2, "label": "Yes, but not in the last year", "label_ar": "نعم، ولكن ليس خلال العام الماضي"}, {"value": 4, "label": "Yes, during the last year", "label_ar": "نعم، خلال العام الماضي"}]),
            q(10, "Has a relative, friend, doctor, or other health worker been concerned about your drinking or suggested you cut down?", "هل أبدى أحد أقاربك أو أصدقائك أو طبيبك أو أي عامل صحي آخر قلقه بشأن شربك أو اقترح عليك التوقف؟",
              [{"value": 0, "label": "No", "label_ar": "لا"}, {"value": 2, "label": "Yes, but not in the last year", "label_ar": "نعم، ولكن ليس خلال العام الماضي"}, {"value": 4, "label": "Yes, during the last year", "label_ar": "نعم، خلال العام الماضي"}]),
        ],
    },
    "pcl5": {
        "instructions": "Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and select how much you have been bothered by that problem in the past month.",
        "instructions_ar": "فيما يلي قائمة بمشاكل يعاني منها بعض الأشخاص أحياناً استجابة لتجربة ضاغطة جداً. يرجى قراءة كل مشكلة بعناية واختيار مدى انزعاجك من هذه المشكلة خلال الشهر الماضي.",
        "questions": [
            q(1, "Repeated, disturbing, and unwanted memories of the stressful experience?", "ذكريات متكررة ومزعجة وغير مرغوب فيها عن التجربة الضاغطة؟", PCL5_OPTIONS_AR, cluster="intrusion"),
            q(2, "Repeated, disturbing dreams of the stressful experience?", "أحلام متكررة ومزعجة عن التجربة الضاغطة؟", PCL5_OPTIONS_AR, cluster="intrusion"),
            q(3, "Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?", "الشعور فجأة أو التصرف وكأن التجربة الضاغطة تحدث فعلاً مرة أخرى (كما لو كنت هناك تعيشها من جديد)؟", PCL5_OPTIONS_AR, cluster="intrusion"),
            q(4, "Feeling very upset when something reminded you of the stressful experience?", "الشعور بانزعاج شديد عندما يذكرك شيء ما بالتجربة الضاغطة؟", PCL5_OPTIONS_AR, cluster="intrusion"),
            q(5, "Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?", "ردود فعل جسدية قوية عندما يذكرك شيء ما بالتجربة الضاغطة (مثل، تسارع ضربات القلب، صعوبة التنفس، التعرق)؟", PCL5_OPTIONS_AR, cluster="intrusion"),
            q(6, "Avoiding memories, thoughts, or feelings related to the stressful experience?", "تجنب الذكريات أو الأفكار أو المشاعر المرتبطة بالتجربة الضاغطة؟", PCL5_OPTIONS_AR, cluster="avoidance"),
            q(7, "Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?", "تجنب المُذكرات الخارجية بالتجربة الضاغطة (مثل، الأشخاص، الأماكن، المحادثات، الأنشطة، الأشياء، أو المواقف)؟", PCL5_OPTIONS_AR, cluster="avoidance"),
            q(8, "Trouble remembering important parts of the stressful experience?", "صعوبة في تذكر أجزاء مهمة من التجربة الضاغطة؟", PCL5_OPTIONS_AR, cluster="negative_alterations"),
            q(9, "Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?", "وجود معتقدات سلبية قوية عن نفسك أو الآخرين أو العالم (مثل، أفكار مثل: أنا سيء، هناك خطأ خطير بي، لا يمكن الوثوق بأحد، العالم خطير تماماً)؟", PCL5_OPTIONS_AR, cluster="negative_alterations"),
            q(10, "Blaming yourself or someone else for the stressful experience or what happened after it?", "لوم نفسك أو شخص آخر على التجربة الضاغطة أو ما حدث بعدها؟", PCL5_OPTIONS_AR, cluster="negative_alterations"),
            q(11, "Having strong negative feelings such as fear, horror, anger, guilt, or shame?", "وجود مشاعر سلبية قوية مثل الخوف أو الرعب أو الغضب أو الذنب أو العار؟", PCL5_OPTIONS_AR, cluster="negative_alterations"),
            q(12, "Loss of interest in activities that you used to enjoy?", "فقدان الاهتمام بأنشطة كنت تستمتع بها من قبل؟", PCL5_OPTIONS_AR, cluster="negative_alterations"),
            q(13, "Feeling distant or cut off from other people?", "الشعور بالبعد أو الانفصال عن الآخرين؟", PCL5_OPTIONS_AR, cluster="negative_alterations"),
            q(14, "Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?", "صعوبة في تجربة مشاعر إيجابية (مثل، عدم القدرة على الشعور بالسعادة أو مشاعر الحب تجاه المقربين منك)؟", PCL5_OPTIONS_AR, cluster="negative_alterations"),
            q(15, "Irritable behavior, angry outbursts, or acting aggressively?", "سلوك عصبي، نوبات غضب، أو التصرف بعدوانية؟", PCL5_OPTIONS_AR, cluster="arousal_reactivity"),
            q(16, "Taking too many risks or doing things that could cause you harm?", "أخذ الكثير من المخاطر أو القيام بأشياء قد تسبب لك الأذى؟", PCL5_OPTIONS_AR, cluster="arousal_reactivity"),
            q(17, "Being \"superalert\" or watchful or on guard?", "أن تكون في حالة تأهب فائق أو حذر شديد أو مترقب؟", PCL5_OPTIONS_AR, cluster="arousal_reactivity"),
            q(18, "Feeling jumpy or easily startled?", "الشعور بالتوتر أو سهولة الانزعاج؟", PCL5_OPTIONS_AR, cluster="arousal_reactivity"),
            q(19, "Having difficulty concentrating?", "صعوبة في التركيز؟", PCL5_OPTIONS_AR, cluster="arousal_reactivity"),
            q(20, "Trouble falling or staying asleep?", "صعوبة في النوم أو الاستمرار في النوم؟", PCL5_OPTIONS_AR, cluster="arousal_reactivity"),
        ],
        "clusters": {"intrusion": [1, 2, 3, 4, 5], "avoidance": [6, 7], "negative_alterations": [8, 9, 10, 11, 12, 13, 14], "arousal_reactivity": [15, 16, 17, 18, 19, 20]},
    },
    "asrs_a": {
        "instructions": "Please answer the questions below, rating yourself on each of the criteria shown using the scale on the right side of the page.",
        "instructions_ar": "يرجى الإجابة على الأسئلة التالية بتقييم نفسك وفق المعايير الموضحة باستخدام المقياس المحدد.",
        "questions": [
            q(1, "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?", "كم مرة تواجه صعوبة في إنهاء التفاصيل النهائية لمشروع ما، بمجرد الانتهاء من الأجزاء الصعبة؟", ASRS_FREQ_AR),
            q(2, "How often do you have difficulty getting things in order when you have to do a task that requires organization?", "كم مرة تواجه صعوبة في ترتيب الأمور عندما يكون لديك مهمة تتطلب التنظيم؟", ASRS_FREQ_AR),
            q(3, "How often do you have problems remembering appointments or obligations?", "كم مرة تواجه مشاكل في تذكر المواعيد أو الالتزامات؟", ASRS_FREQ_AR),
            q(4, "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?", "عندما يكون لديك مهمة تتطلب الكثير من التفكير، كم مرة تتجنب أو تؤجل البدء بها؟", ASRS_FREQ_AR),
            q(5, "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?", "كم مرة تتململ أو تحرك يديك أو قدميك عندما تضطر للجلوس لفترة طويلة؟", ASRS_FREQ_AR),
            q(6, "How often do you feel overly active and compelled to do things, like you were driven by a motor?", "كم مرة تشعر بأنك نشيط بشكل مفرط ومندفع للقيام بالأشياء، وكأنك مدفوع بمحرك؟", ASRS_FREQ_AR),
        ],
    },
    "scoff": {
        "instructions": "Please answer each question with Yes or No.",
        "instructions_ar": "يرجى الإجابة على كل سؤال بنعم أو لا.",
        "questions": [
            q(1, "Do you make yourself Sick because you feel uncomfortably full?", "هل تجعل نفسك تتقيأ لأنك تشعر بالشبع الزائد بشكل غير مريح؟", YES_NO_AR),
            q(2, "Do you worry you have lost Control over how much you eat?", "هل تقلق من أنك فقدت السيطرة على كمية طعامك؟", YES_NO_AR),
            q(3, "Have you recently lost more than One stone (about 6.4 kg / 14 lbs) in a 3-month period?", "هل فقدت مؤخراً أكثر من ستة كيلوجرامات تقريباً خلال فترة ثلاثة أشهر؟", YES_NO_AR),
            q(4, "Do you believe yourself to be Fat when others say you are too thin?", "هل تعتقد أنك سمين بينما يقول الآخرون إنك نحيف جداً؟", YES_NO_AR),
            q(5, "Would you say that Food dominates your life?", "هل تقول إن الطعام يسيطر على حياتك؟", YES_NO_AR),
        ],
    },
    "dast10": {
        "instructions": "The following questions concern information about your involvement with drugs, not including alcohol or tobacco, over the past 12 months. Please answer Yes or No to each question.",
        "instructions_ar": "تتعلق الأسئلة التالية بمعلومات حول تعاطيك للمخدرات، باستثناء الكحول والتبغ، خلال الـ12 شهراً الماضية. يرجى الإجابة بنعم أو لا على كل سؤال.",
        "questions": [
            q(1, "Have you used drugs other than those required for medical reasons?", "هل تعاطيت أدوية أو عقاقير أخرى غير تلك التي تحتاجها لأسباب طبية؟", YES_NO_AR),
            q(2, "Do you abuse more than one drug at a time?", "هل تسيء استخدام أكثر من عقار واحد في نفس الوقت؟", YES_NO_AR),
            q(3, "Are you always able to stop using drugs when you want to?", "هل أنت قادر دائماً على التوقف عن تعاطي العقاقير عندما تريد ذلك؟", YES_NO_AR, reverse_scored=True),
            q(4, "Have you had \"blackouts\" or \"flashbacks\" as a result of drug use?", "هل تعرضت لـ\"فقدان للذاكرة\" أو \"ومضات ارتجاعية\" نتيجة تعاطي العقاقير؟", YES_NO_AR),
            q(5, "Do you ever feel bad or guilty about your drug use?", "هل تشعر بالسوء أو الذنب بشأن تعاطيك للعقاقير؟", YES_NO_AR),
            q(6, "Does your spouse, partner, or parents ever complain about your involvement with drugs?", "هل يشتكي زوجك/زوجتك أو شريكك أو والداك من تورطك مع العقاقير؟", YES_NO_AR),
            q(7, "Have you neglected your family because of your use of drugs?", "هل أهملت عائلتك بسبب تعاطيك للعقاقير؟", YES_NO_AR),
            q(8, "Have you engaged in illegal activities in order to obtain drugs?", "هل انخرطت في أنشطة غير قانونية للحصول على العقاقير؟", YES_NO_AR),
            q(9, "Have you ever experienced withdrawal symptoms (felt sick) when you stopped taking drugs?", "هل عانيت من أعراض انسحاب (شعرت بالمرض) عند التوقف عن تعاطي العقاقير؟", YES_NO_AR),
            q(10, "Have you had medical problems as a result of your drug use (e.g., memory loss, hepatitis, convulsions, bleeding)?", "هل عانيت من مشاكل طبية نتيجة تعاطيك للعقاقير (مثل فقدان الذاكرة، التهاب الكبد، التشنجات، النزيف)؟", YES_NO_AR),
        ],
    },
    "ras": {
        "instructions": "Please rate each statement about your current relationship on a scale from low to high.",
        "instructions_ar": "يرجى تقييم كل عبارة عن علاقتك الحالية على مقياس من منخفض إلى مرتفع.",
        "questions": [
            q(1, "How well does your partner meet your needs?", "ما مدى تلبية شريكك لاحتياجاتك؟", RAS_SCALE_AR),
            q(2, "In general, how satisfied are you with your relationship?", "بشكل عام، ما مدى رضاك عن علاقتك؟", RAS_SCALE_AR),
            q(3, "How good is your relationship compared to most?", "ما مدى جودة علاقتك مقارنة بمعظم العلاقات؟", RAS_SCALE_AR),
            q(4, "How often do you wish you hadn't gotten into this relationship?", "كم مرة تتمنى لو لم تدخل في هذه العلاقة؟", RAS_SCALE_AR, reverse_scored=True),
            q(5, "To what extent has your relationship met your original expectations?", "إلى أي مدى لبت علاقتك توقعاتك الأصلية؟", RAS_SCALE_AR),
            q(6, "How much do you love your partner?", "كم تحب شريكك؟", RAS_SCALE_AR),
            q(7, "How many problems are there in your relationship?", "كم عدد المشاكل الموجودة في علاقتك؟", RAS_SCALE_AR, reverse_scored=True),
        ],
    },
}


async def main() -> None:
    dsn = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(dsn=dsn)
    try:
        for key, bilingual in BILINGUAL_UPDATES.items():
            row = await conn.fetchrow(
                """
                SELECT av.id, av.definition_json
                FROM assessment_catalog ac
                JOIN assessment_versions av ON av.id = ac.current_published_version_id
                WHERE ac.template_key = $1
                """,
                key,
            )
            if not row:
                print(f"  SKIP {key}: no published version found")
                continue
            existing = json.loads(row["definition_json"]) if isinstance(row["definition_json"], str) else row["definition_json"]
            merged = {**existing, **bilingual}
            await conn.execute(
                """
                UPDATE assessment_versions
                SET definition_json = $1::jsonb,
                    notes = COALESCE(notes || ' ', '') || 'Arabic translation added (AI-assisted, authored directly) -- please spot-check for clinical/linguistic accuracy.'
                WHERE id = $2
                """,
                json.dumps(merged), row["id"],
            )
            print(f"  updated {key}: {row['id']}")
    finally:
        await conn.close()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
