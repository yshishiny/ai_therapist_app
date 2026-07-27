"""
add_bilingual_content_batch2.py — Bilingual content for the remaining
6 originally-authored English instruments (SDI-7, MPI-21, API-10,
CDSS-14, CASS-13, CBI). Same text/text_ar convention as
add_bilingual_content.py. Deferred from the first bilingual pass since
these are original (not real/published) instruments -- lower urgency
than the real free ones, but completing full coverage now as requested.

Usage:
    DATABASE_URL=postgresql://... python add_bilingual_content_batch2.py
"""

from __future__ import annotations

import asyncio
import json
import os

import asyncpg

SEVERITY_0_4_AR = [
    {"value": 0, "label": "None", "label_ar": "لا شيء"},
    {"value": 1, "label": "Mild", "label_ar": "خفيف"},
    {"value": 2, "label": "Moderate", "label_ar": "متوسط"},
    {"value": 3, "label": "Severe", "label_ar": "شديد"},
    {"value": 4, "label": "Very severe", "label_ar": "شديد جداً"},
]

ORIGINAL_0_3_AR = [
    {"value": 0, "label": "Not at all", "label_ar": "لا ينطبق إطلاقاً"},
    {"value": 1, "label": "Mild / some of the time", "label_ar": "خفيف"},
    {"value": 2, "label": "Moderate / much of the time", "label_ar": "متوسط"},
    {"value": 3, "label": "Severe / most or all of the time", "label_ar": "شديد"},
]

CLINICIAN_0_4_AR = [
    {"value": 0, "label": "Absent", "label_ar": "غائب"},
    {"value": 1, "label": "Doubtful / mild", "label_ar": "مشكوك فيه"},
    {"value": 2, "label": "Mild to moderate", "label_ar": "خفيف إلى متوسط"},
    {"value": 3, "label": "Moderate to severe", "label_ar": "متوسط إلى شديد"},
    {"value": 4, "label": "Severe", "label_ar": "شديد"},
]

CBI_SCALE_AR = [
    {"value": 0, "label": "Never / almost never", "label_ar": "أبداً"},
    {"value": 25, "label": "Seldom", "label_ar": "نادراً"},
    {"value": 50, "label": "Sometimes", "label_ar": "أحياناً"},
    {"value": 75, "label": "Often", "label_ar": "غالباً"},
    {"value": 100, "label": "Always", "label_ar": "دائماً"},
]


def q(id_, text, text_ar, options, **extra):
    d = {"id": id_, "text": text, "text_ar": text_ar, "type": "single_choice", "options": options}
    d.update(extra)
    return d


BILINGUAL_UPDATES = {
    "sdi7": {
        "instructions": "Please rate the current severity of your sleep difficulties over the past two weeks.",
        "instructions_ar": "يرجى تقييم شدة صعوبات نومك الحالية خلال الأسبوعين الماضيين.",
        "questions": [
            q(1, "Difficulty falling asleep", "صعوبة في بدء النوم", SEVERITY_0_4_AR),
            q(2, "Difficulty staying asleep (waking during the night)", "صعوبة في الاستمرار بالنوم (الاستيقاظ أثناء الليل)", SEVERITY_0_4_AR),
            q(3, "Waking up too early and being unable to get back to sleep", "الاستيقاظ مبكراً جداً وعدم القدرة على العودة للنوم", SEVERITY_0_4_AR),
            q(4, "Dissatisfaction with your current sleep pattern", "عدم الرضا عن نمط نومك الحالي", SEVERITY_0_4_AR),
            q(5, "How noticeable your sleep problem is to others, in terms of your mood or how you function", "مدى وضوح مشكلة نومك للآخرين، من ناحية مزاجك أو أدائك", SEVERITY_0_4_AR),
            q(6, "How worried or distressed you feel about your current sleep difficulties", "مدى قلقك أو انزعاجك من صعوبات نومك الحالية", SEVERITY_0_4_AR),
            q(7, "Interference with your daily functioning (energy, mood, concentration, work) caused by your sleep difficulties", "مدى تأثير صعوبات نومك على أدائك اليومي (الطاقة، المزاج، التركيز، العمل)", SEVERITY_0_4_AR),
        ],
    },
    "mpi21": {
        "instructions": "Please rate how much each statement has applied to you over the past two weeks.",
        "instructions_ar": "يرجى تقييم مدى انطباق كل عبارة عليك خلال الأسبوعين الماضيين.",
        "questions": [
            q(1, "I feel sad or down more often than not.", "أشعر بالحزن أو الانخفاض المزاجي أكثر مما لا", ORIGINAL_0_3_AR),
            q(2, "I feel discouraged about how things will turn out for me.", "أشعر بالتشاؤم حيال كيفية سير الأمور بالنسبة لي", ORIGINAL_0_3_AR),
            q(3, "I feel like I have failed at things more than most people.", "أشعر أنني فشلت في أمور أكثر من معظم الناس", ORIGINAL_0_3_AR),
            q(4, "I get less enjoyment out of things I used to like doing.", "أستمتع بالأشياء التي كنت أحبها من قبل بشكل أقل", ORIGINAL_0_3_AR),
            q(5, "I feel guilty about things, even small ones, more than seems reasonable.", "أشعر بالذنب حيال أمور، حتى الصغيرة منها، أكثر مما يبدو معقولاً", ORIGINAL_0_3_AR),
            q(6, "I feel like I deserve to be punished for my mistakes.", "أشعر أنني أستحق العقاب على أخطائي", ORIGINAL_0_3_AR),
            q(7, "I feel disappointed in myself.", "أشعر بخيبة أمل في نفسي", ORIGINAL_0_3_AR),
            q(8, "I am harder on myself and more self-critical than I used to be.", "أصبحت أكثر قسوة ونقداً لنفسي مما كنت عليه", ORIGINAL_0_3_AR),
            q(9, "I have thoughts of harming myself, or that I would be better off not alive.", "لدي أفكار بإيذاء نفسي، أو أنني سأكون أفضل حالاً لو لم أكن حياً", ORIGINAL_0_3_AR),
            q(10, "I find myself crying more than usual, or feeling like crying but unable to.", "أجد نفسي أبكي أكثر من المعتاد، أو أشعر برغبة بالبكاء لكن دون القدرة على ذلك", ORIGINAL_0_3_AR),
            q(11, "I feel more agitated or on edge than usual.", "أشعر بالتوتر أو الانفعال أكثر من المعتاد", ORIGINAL_0_3_AR),
            q(12, "I have lost interest in other people or activities I used to care about.", "فقدت الاهتمام بالآخرين أو بأنشطة كنت أهتم بها", ORIGINAL_0_3_AR),
            q(13, "I have a harder time making decisions than I used to.", "أجد صعوبة أكبر في اتخاذ القرارات مما كنت عليه", ORIGINAL_0_3_AR),
            q(14, "I feel that I am not worth very much as a person.", "أشعر أنني لا أساوي الكثير كشخص", ORIGINAL_0_3_AR),
            q(15, "I have less energy to get things done.", "لدي طاقة أقل لإنجاز الأمور", ORIGINAL_0_3_AR),
            q(16, "My sleep has changed noticeably (too little or too much) recently.", "تغير نومي بشكل ملحوظ (قليل جداً أو كثير جداً) مؤخراً", ORIGINAL_0_3_AR),
            q(17, "I feel more irritable than usual.", "أشعر بتهيج أكثر من المعتاد", ORIGINAL_0_3_AR),
            q(18, "My appetite has changed noticeably (too little or too much) recently.", "تغيرت شهيتي بشكل ملحوظ (قليلة جداً أو كثيرة جداً) مؤخراً", ORIGINAL_0_3_AR),
            q(19, "I have trouble concentrating on things like reading or conversations.", "أواجه صعوبة في التركيز على أمور مثل القراءة أو المحادثات", ORIGINAL_0_3_AR),
            q(20, "I feel tired or worn out even without much physical effort.", "أشعر بالتعب أو الإرهاق حتى دون بذل مجهود جسدي كبير", ORIGINAL_0_3_AR),
            q(21, "I've lost interest in closeness or intimacy with others.", "فقدت الاهتمام بالقرب أو العلاقة الحميمة مع الآخرين", ORIGINAL_0_3_AR),
        ],
    },
    "api10": {
        "instructions": "Please rate how much each symptom has bothered you over the past week.",
        "instructions_ar": "يرجى تقييم مدى انزعاجك من كل عرض خلال الأسبوع الماضي.",
        "questions": [
            q(1, "I notice my heart racing or pounding without a clear physical reason.", "ألاحظ تسارع أو خفقان قلبي دون سبب جسدي واضح", ORIGINAL_0_3_AR),
            q(2, "I feel shaky or trembly.", "أشعر برجفة أو ارتجاف", ORIGINAL_0_3_AR),
            q(3, "I feel unsteady or like I might lose my balance.", "أشعر بعدم الاتزان أو وكأنني قد أفقد توازني", ORIGINAL_0_3_AR),
            q(4, "I have trouble catching my breath or feel like I can't get enough air.", "أواجه صعوبة في التقاط أنفاسي أو أشعر أنني لا أستطيع الحصول على ما يكفي من الهواء", ORIGINAL_0_3_AR),
            q(5, "I sweat or feel hot flashes even when I'm not physically exerting myself.", "أتعرق أو أشعر بهبات ساخنة حتى دون بذل مجهود جسدي", ORIGINAL_0_3_AR),
            q(6, "I feel a sense of dread, like something bad is about to happen.", "أشعر بإحساس من الخطر الوشيك، وكأن شيئاً سيئاً على وشك الحدوث", ORIGINAL_0_3_AR),
            q(7, "I feel keyed up, tense, or unable to relax.", "أشعر بالتوتر الشديد أو عدم القدرة على الاسترخاء", ORIGINAL_0_3_AR),
            q(8, "I worry I am losing control or \"going crazy.\"", "أقلق من أنني أفقد السيطرة أو \"أفقد عقلي\"", ORIGINAL_0_3_AR),
            q(9, "I feel a knot in my stomach or nausea related to worry.", "أشعر بعقدة في معدتي أو غثيان مرتبط بالقلق", ORIGINAL_0_3_AR),
            q(10, "I feel a strong urge to escape or avoid a situation because of how anxious it makes me.", "أشعر برغبة قوية بالهروب أو تجنب موقف بسبب شدة القلق الذي يسببه لي", ORIGINAL_0_3_AR),
        ],
    },
    "cdss14": {
        "instructions": "To be completed by the treating clinician based on a structured or semi-structured interview with the patient. Not intended for direct patient self-report.",
        "instructions_ar": "تُستكمل بواسطة المعالج المعالج بناءً على مقابلة سريرية منظمة أو شبه منظمة مع المريض. لا تستخدم كتقرير ذاتي مباشر من المريض.",
        "questions": [
            q(1, "Depressed mood (sadness, hopelessness, helplessness, worthlessness)", "المزاج المكتئب (الحزن، اليأس، انعدام الحيلة، الشعور بانعدام القيمة)", CLINICIAN_0_4_AR),
            q(2, "Guilt / self-reproach", "الشعور بالذنب / لوم الذات", CLINICIAN_0_4_AR),
            q(3, "Suicidal ideation or intent", "الأفكار الانتحارية أو نية الانتحار", CLINICIAN_0_4_AR),
            q(4, "Difficulty falling asleep (early insomnia)", "صعوبة الخلود إلى النوم (أرق بداية النوم)", CLINICIAN_0_4_AR),
            q(5, "Difficulty staying asleep (middle insomnia)", "صعوبة الاستمرار بالنوم (أرق منتصف الليل)", CLINICIAN_0_4_AR),
            q(6, "Early morning waking (late insomnia)", "الاستيقاظ المبكر (أرق نهاية الليل)", CLINICIAN_0_4_AR),
            q(7, "Reduced interest or engagement in work or usual activities", "انخفاض الاهتمام أو الانخراط في العمل أو الأنشطة المعتادة", CLINICIAN_0_4_AR),
            q(8, "Psychomotor retardation (slowed speech, movement, thinking)", "التباطؤ الحركي النفسي (بطء الكلام، الحركة، التفكير)", CLINICIAN_0_4_AR),
            q(9, "Psychomotor agitation (restlessness, fidgeting)", "التهيج الحركي النفسي (التململ، الاضطراب)", CLINICIAN_0_4_AR),
            q(10, "Psychological anxiety (subjective tension, worry, irritability)", "القلق النفسي (التوتر الذاتي، القلق، التهيج)", CLINICIAN_0_4_AR),
            q(11, "Somatic symptoms (GI complaints, fatigue, aches, appetite or weight changes)", "الأعراض الجسدية (شكاوى هضمية، إرهاق، آلام، تغيرات في الشهية أو الوزن)", CLINICIAN_0_4_AR),
            q(12, "Loss of insight into the nature or severity of the condition", "فقدان البصيرة حول طبيعة أو شدة الحالة", CLINICIAN_0_4_AR),
            q(13, "Diurnal variation (symptoms notably worse at a particular time of day)", "التقلب النهاري (تفاقم الأعراض في وقت معين من اليوم)", CLINICIAN_0_4_AR),
            q(14, "Depersonalization or derealization", "تبدد الشخصية أو تبدد الواقع", CLINICIAN_0_4_AR),
        ],
    },
    "cass13": {
        "instructions": "To be completed by the treating clinician based on a structured or semi-structured interview with the patient. Not intended for direct patient self-report.",
        "instructions_ar": "تُستكمل بواسطة المعالج المعالج بناءً على مقابلة سريرية منظمة أو شبه منظمة مع المريض. لا تستخدم كتقرير ذاتي مباشر من المريض.",
        "questions": [
            q(1, "Anxious mood (worry, apprehension, irritability)", "المزاج القلق (القلق، التوجس، التهيج)", CLINICIAN_0_4_AR),
            q(2, "Tension (subjective tension, startling easily, trembling, restlessness)", "التوتر (التوتر الذاتي، سهولة الانزعاج، الارتجاف، التململ)", CLINICIAN_0_4_AR),
            q(3, "Fears (of crowds, being alone, animals, travel, etc.)", "المخاوف (من الحشود، الوحدة، الحيوانات، السفر، إلخ)", CLINICIAN_0_4_AR),
            q(4, "Sleep disturbance related to anxiety or worry", "اضطراب النوم المرتبط بالقلق أو التفكير المفرط", CLINICIAN_0_4_AR),
            q(5, "Cognitive difficulties (poor concentration, memory complaints related to anxiety)", "صعوبات معرفية (ضعف التركيز، شكاوى الذاكرة المرتبطة بالقلق)", CLINICIAN_0_4_AR),
            q(6, "Low mood accompanying the anxiety", "المزاج المنخفض المصاحب للقلق", CLINICIAN_0_4_AR),
            q(7, "Muscular tension (aches, stiffness, restlessness)", "التوتر العضلي (آلام، تيبس، تململ)", CLINICIAN_0_4_AR),
            q(8, "Sensory symptoms (ringing in ears, blurred vision, tingling)", "الأعراض الحسية (طنين الأذن، عدم وضوح الرؤية، وخز)", CLINICIAN_0_4_AR),
            q(9, "Cardiovascular symptoms (palpitations, chest discomfort)", "الأعراض القلبية الوعائية (خفقان، انزعاج في الصدر)", CLINICIAN_0_4_AR),
            q(10, "Respiratory symptoms (chest tightness, breathlessness)", "الأعراض التنفسية (ضيق في الصدر، ضيق النفس)", CLINICIAN_0_4_AR),
            q(11, "Gastrointestinal symptoms (nausea, stomach discomfort, indigestion)", "الأعراض الهضمية (غثيان، انزعاج في المعدة، عسر هضم)", CLINICIAN_0_4_AR),
            q(12, "Autonomic symptoms (dry mouth, sweating, dizziness)", "الأعراض اللاإرادية (جفاف الفم، التعرق، الدوخة)", CLINICIAN_0_4_AR),
            q(13, "Observable behavior during the interview (fidgeting, restlessness, tremor, sweating, facial or postural tension)", "السلوك الملحوظ أثناء المقابلة (التململ، الاضطراب، الارتجاف، التعرق، توتر الوجه أو الوضعية)", CLINICIAN_0_4_AR),
        ],
    },
    "cbi": {
        "instructions": "Please answer each question based on how you have generally felt recently. Intended primarily for clinician/staff self-assessment of burnout, not for assignment to patients.",
        "instructions_ar": "يرجى الإجابة على كل سؤال بناءً على شعورك العام مؤخراً. مخصص بشكل أساسي للتقييم الذاتي للمعالج/الطاقم، وليس للتوزيع على المرضى.",
        "questions": [
            q(1, "How often do you feel tired?", "كم مرة تشعر بالتعب؟", CBI_SCALE_AR, subscale="personal_burnout"),
            q(2, "How often are you physically exhausted?", "كم مرة تشعر بالإرهاق الجسدي؟", CBI_SCALE_AR, subscale="personal_burnout"),
            q(3, "How often are you emotionally exhausted?", "كم مرة تشعر بالإرهاق العاطفي؟", CBI_SCALE_AR, subscale="personal_burnout"),
            q(4, "How often do you think, \"I can't take it anymore\"?", "كم مرة تفكر \"لا أستطيع تحمل هذا بعد الآن\"؟", CBI_SCALE_AR, subscale="personal_burnout"),
            q(5, "How often do you feel worn out?", "كم مرة تشعر بالإنهاك؟", CBI_SCALE_AR, subscale="personal_burnout"),
            q(6, "How often do you feel weak and susceptible to illness?", "كم مرة تشعر بالضعف والقابلية للإصابة بالمرض؟", CBI_SCALE_AR, subscale="personal_burnout"),
            q(7, "Do you feel worn out at the end of the working day?", "هل تشعر بالإرهاق في نهاية يوم العمل؟", CBI_SCALE_AR, subscale="work_related_burnout"),
            q(8, "Are you exhausted in the morning at the thought of another day at work?", "هل تشعر بالإنهاك في الصباح عند التفكير بيوم عمل آخر؟", CBI_SCALE_AR, subscale="work_related_burnout"),
            q(9, "Do you feel that every working hour is tiring for you?", "هل تشعر أن كل ساعة عمل مرهقة بالنسبة لك؟", CBI_SCALE_AR, subscale="work_related_burnout"),
            q(10, "Do you have enough energy for family and friends during leisure time?", "هل لديك طاقة كافية للعائلة والأصدقاء خلال وقت الفراغ؟", CBI_SCALE_AR, subscale="work_related_burnout", reverse_scored=True),
            q(11, "Is your work emotionally exhausting?", "هل عملك مرهق عاطفياً؟", CBI_SCALE_AR, subscale="work_related_burnout"),
            q(12, "Does your work frustrate you?", "هل يسبب لك عملك الإحباط؟", CBI_SCALE_AR, subscale="work_related_burnout"),
            q(13, "Do you feel burnt out because of your work?", "هل تشعر بالإرهاق بسبب عملك؟", CBI_SCALE_AR, subscale="work_related_burnout"),
            q(14, "Do you find it hard to work with patients?", "هل تجد صعوبة في العمل مع المرضى؟", CBI_SCALE_AR, subscale="client_related_burnout"),
            q(15, "Do you find it frustrating to work with patients?", "هل تجد أنه من المحبط العمل مع المرضى؟", CBI_SCALE_AR, subscale="client_related_burnout"),
            q(16, "Does it drain your energy to work with patients?", "هل يستنزف العمل مع المرضى طاقتك؟", CBI_SCALE_AR, subscale="client_related_burnout"),
            q(17, "Do you feel that you give more than you get back when you work with patients?", "هل تشعر أنك تعطي أكثر مما تحصل عليه عند العمل مع المرضى؟", CBI_SCALE_AR, subscale="client_related_burnout"),
            q(18, "Are you tired of working with patients?", "هل أنت متعب من العمل مع المرضى؟", CBI_SCALE_AR, subscale="client_related_burnout"),
            q(19, "Do you sometimes wonder how long you will be able to continue working with patients?", "هل تتساءل أحياناً كم من الوقت ستتمكن من الاستمرار في العمل مع المرضى؟", CBI_SCALE_AR, subscale="client_related_burnout"),
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
