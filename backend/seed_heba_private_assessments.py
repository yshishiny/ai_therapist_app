"""
seed_heba_private_assessments.py — Owner-scoped seed for Dr. Heba's materials
------------------------------------------------------------------
Content sourced from real PDFs Dr. Heba provided (extracted via pypdf,
verified readable, not fabricated). Scoped to her clinician account only
(owner_user_id) per instruction -- not visible to other clinicians in the
org, only to her and org admins.

- Y-BOCS (Yale-Brown Obsessive Compulsive Scale) -- Arabic translation
  attributed in-document to Samah Abdelmawla & Dr. Alhadi Ahmed
  (CBTarabia.com), a freely-circulated Arabic CBT training-resource
  translation, not extracted from a paywalled commercial product.
- Emotional Intelligence Scale (45 items) -- locally-authored academic
  instrument (validated by a panel of 10 psychology specialists per the
  document's own methodology section), based on Mayer & Salovey's EI
  framework but with independently authored items, not a translation of
  a specific named copyrighted instrument.

Deliberately NOT included here: Beck Depression Scale (Arabic translation
of a still-commercially-sold Pearson product) and SCID-II (APA structured
interview typically requiring clinician certification to administer) --
holding those for Dr. Heba to upload herself through the review pipeline,
confirming her own usage rights at the point of upload, rather than a
third party seeding them on her behalf.

Usage:
    DATABASE_URL=postgresql://... SEED_ORG_ID=... SEED_ADMIN_ID=... SEED_OWNER_ID=... python seed_heba_private_assessments.py
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid

import asyncpg

TIME_ANCHORS = [
    {"value": 0, "label": "لا شيء"},
    {"value": 1, "label": "أقل من ساعة في اليوم، أو تتكرر أحياناً (8 مرات يومياً فأقل)"},
    {"value": 2, "label": "من ساعة إلى 3 ساعات في اليوم، أو تتكرر كثيراً لكن معظم اليوم خالٍ منها"},
    {"value": 3, "label": "من 3 إلى 8 ساعات في اليوم، أو تحدث كثيراً جداً"},
    {"value": 4, "label": "أكثر من 8 ساعات في اليوم، أو تحدث بشكل شبه دائم"},
]

INTERFERENCE_ANCHORS = [
    {"value": 0, "label": "لا يوجد"},
    {"value": 1, "label": "تعارض خفيف مع النشاطات الاجتماعية أو العملية، لا يتأثر النشاط العام"},
    {"value": 2, "label": "تعارض واضح لكن يمكن السيطرة عليه"},
    {"value": 3, "label": "تسبب خللاً كبيراً في أداء النشاطات الاجتماعية أو العملية"},
    {"value": 4, "label": "تسبب عجزاً كبيراً / بليغاً"},
]

DISTRESS_ANCHORS = [
    {"value": 0, "label": "لا يوجد"},
    {"value": 1, "label": "خفيف (أحياناً)، ليس مزعجاً"},
    {"value": 2, "label": "متوسط (غالباً)، مزعج لكن يمكن السيطرة عليه"},
    {"value": 3, "label": "شديد جداً (أغلب الوقت)، مزعج جداً"},
    {"value": 4, "label": "بليغ (دائم)، شبه معيق"},
]

RESISTANCE_ANCHORS = [
    {"value": 0, "label": "أقاوم دائماً حتى لا أبذل جهداً، أو الأفكار/الأفعال قليلة جداً بحيث لا حاجة للمقاومة"},
    {"value": 1, "label": "أحاول أن أقاوم معظم الوقت"},
    {"value": 2, "label": "أبذل بعض الجهد لأقاوم"},
    {"value": 3, "label": "أستسلم لكل الأفكار/الأفعال الوسواسية بدون محاولة للسيطرة، وإن حاولت فبعد تردد"},
    {"value": 4, "label": "أستسلم كلية وبإرادتي لكل الأفكار/الأفعال الوسواسية"},
]

CONTROL_ANCHORS = [
    {"value": 0, "label": "سيطرة تامة"},
    {"value": 1, "label": "سيطرة كبيرة، عادة يمكنني إيقافها أو صرف انتباهي عنها بجهد وتركيز"},
    {"value": 2, "label": "سيطرة متوسطة، أستطيع أحياناً إيقافها أو صرف انتباهي عنها"},
    {"value": 3, "label": "سيطرة قليلة، نادراً ما أنجح في إيقافها، أستطيع فقط صرف الانتباه بصعوبة"},
    {"value": 4, "label": "سيطرة قليلة جداً، نادراً ما أستطيع صرف الانتباه ولو للحظات"},
]

YBOCS = {
    "template_key": "ybocs_ar",
    "name": "مقياس بيل براون للوسواس القهري (Y-BOCS)",
    "description": "Yale-Brown Obsessive Compulsive Scale, Arabic translation (Samah Abdelmawla & Dr. Alhadi Ahmed, CBTarabia.com).",
    "template_type": "SCREENING",
    "license_status": "VERIFY",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "بما فيها وقت هذه الجلسة، ضع علامة على يمين كل بند توضح معدل حدوث الجملة التالية خلال السبعة أيام الماضية.",
        "questions": [
            {"id": 1, "section": "obsessions", "text": "مقدار الوقت الذي تستغرقه الأفكار الوسواسية", "type": "single_choice", "options": TIME_ANCHORS},
            {"id": 2, "section": "obsessions", "text": "مقدار التعارض الذي تحدثه الأفكار الوسواسية مع نشاطاتك الاجتماعية والعملية", "type": "single_choice", "options": INTERFERENCE_ANCHORS},
            {"id": 3, "section": "obsessions", "text": "مقدار التوتر والقلق المصاحب للأفكار الوسواسية", "type": "single_choice", "options": DISTRESS_ANCHORS},
            {"id": 4, "section": "obsessions", "text": "مقدار الجهد المبذول في مقاومة الأفكار الوسواسية", "type": "single_choice", "options": RESISTANCE_ANCHORS},
            {"id": 5, "section": "obsessions", "text": "مقدار سيطرتك على الأفكار الوسواسية", "type": "single_choice", "options": CONTROL_ANCHORS},
            {"id": 6, "section": "compulsions", "text": "مقدار الوقت الذي تمضيه في القيام بالأفعال القهرية", "type": "single_choice", "options": TIME_ANCHORS},
            {"id": 7, "section": "compulsions", "text": "مقدار التعارض الذي تحدثه الأفعال القهرية في نشاطاتك الاجتماعية والعملية", "type": "single_choice", "options": INTERFERENCE_ANCHORS},
            {"id": 8, "section": "compulsions", "text": "مقدار التوتر والقلق الناتج في حال الامتناع عن القيام بالأفعال القهرية", "type": "single_choice", "options": DISTRESS_ANCHORS},
            {"id": 9, "section": "compulsions", "text": "مقدار الجهد المبذول في مقاومة الأفعال القهرية", "type": "single_choice", "options": RESISTANCE_ANCHORS},
            {"id": 10, "section": "compulsions", "text": "مقدار سيطرتك على الأفعال القهرية", "type": "single_choice", "options": CONTROL_ANCHORS},
        ],
        "sections": {"obsessions": [1, 2, 3, 4, 5], "compulsions": [6, 7, 8, 9, 10]},
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 40},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 7, "label": "خفيف جداً (Subclinical)"},
            {"min": 8, "max": 15, "label": "خفيف (Mild)"},
            {"min": 16, "max": 23, "label": "متوسط (Moderate)"},
            {"min": 24, "max": 31, "label": "ملحوظ / شديد (Severe)"},
            {"min": 32, "max": 40, "label": "شديد جداً (Extreme)"},
        ]
    },
    "risk_rules": None,
    "notes": "Digitized from Dr. Heba's own PDF (real text extracted, not fabricated). Arabic translation attributed in-document to Samah Abdelmawla & Dr. Alhadi Ahmed via CBTarabia.com, a freely-circulated Arabic CBT training resource. License status set to VERIFY rather than FREE pending confirmation of the original Y-BOCS's exact current licensing terms. Owner-scoped to Dr. Heba's account only, not visible org-wide.",
}

EI_SCALE = {
    "template_key": "ei_scale_ar",
    "name": "مقياس الذكاء العاطفي",
    "description": "Emotional Intelligence Scale (45 items), Arabic -- locally authored academic instrument based on the Mayer & Salovey EI framework, validated by a panel of 10 psychology specialists per the source document.",
    "template_type": "SCREENING",
    "license_status": "VERIFY",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "اختر إحدى الاختيارات الخمس التالية التي تصف حالتك: دائماً، غالباً، أحياناً، نادراً، أبداً.",
        "options": [
            {"value": 1, "label": "أبداً"},
            {"value": 2, "label": "نادراً"},
            {"value": 3, "label": "أحياناً"},
            {"value": 4, "label": "غالباً"},
            {"value": 5, "label": "دائماً"},
        ],
        "questions": [
            {"id": 1, "text": "عندما أكون سعيدة أتصرف دون حذر ودون تفكير"},
            {"id": 2, "text": "أتحدث مع الآخرين دون مراعاة لمزاجهم"},
            {"id": 3, "text": "حزني عندما أخطئ يجعلني أعيد التفكير في خطئي وأكون حذرة بحيث لا أكرره", "reverse_scored": True},
            {"id": 4, "text": "أؤجل التخطيط في الأمور التي تتطلب تركيز للأوقات التي أكون فيها بمزاج جيد", "reverse_scored": True},
            {"id": 5, "text": "استطيع الاحتفاظ بهدوئي حتى عندما أكون متضايقة"},
            {"id": 6, "text": "أفسد لحظات سعيدة عندما يحدث موقف بسيط يزعجني أثناءها"},
            {"id": 7, "text": "تعتريني نوبات خوف لا أعي مصدرها"},
            {"id": 8, "text": "قد انتقل دون مبرر من الضيق البسيط إلى الحزن الشديد", "reverse_scored": True},
            {"id": 9, "text": "أدرك مسبقاً المواقف التي تستثير غضبي", "reverse_scored": True},
            {"id": 10, "text": "ابتعد عن الدخول في مناقشات عندما أكون بمزاج سيء", "reverse_scored": True},
            {"id": 11, "text": "أظهر سروري عندما تقدم لي هدية حتى وان لم تعجبني"},
            {"id": 12, "text": "أعبر عن مشاعري دون مراعاة للآخرين", "reverse_scored": True},
            {"id": 13, "text": "استطيع الانتقال من المشاعر السيئة إلى الإيجابية حسب الموقف"},
            {"id": 14, "text": "خوفي من بعض الأمور يربكني عند التعامل معها"},
            {"id": 15, "text": "عندما أخطئ أتضايق مما يدفعني لعدم التفكير بطريقة سليمة"},
            {"id": 16, "text": "أميّز بين انفعالات الآخرين المختلفة", "reverse_scored": True},
            {"id": 17, "text": "أجد صعوبة في فهم مشاعر الآخرين"},
            {"id": 18, "text": "لدي قدرة عالية على وصف ما اشعر به", "reverse_scored": True},
            {"id": 19, "text": "استطيع التمييز بين الحزن الحقيقي والمصطنع", "reverse_scored": True},
            {"id": 20, "text": "أدرك مسبقاً أي المواقف ستسرني وأيها سيضايقني"},
            {"id": 21, "text": "أتحكم في انفعالاتي", "reverse_scored": True},
            {"id": 22, "text": "اذا تعرضت لمشكلة وتوترت أؤجل حلها حتى يعتدل مزاجي"},
            {"id": 23, "text": "يعيقني قلقي عند تنفيذ بعض المهام من إتمامها بشكل حسن"},
            {"id": 24, "text": "افهم انفعالات الآخرين وأتعامل معهم بالشكل المناسب"},
            {"id": 25, "text": "يؤثر مزاجي على مستوى أدائي"},
            {"id": 26, "text": "افتقد القدرة على التعامل مع مشاعري بشكل يتلائم مع المواقف"},
            {"id": 27, "text": "اشعر بالخوف من بعض الأمور بدرجة مبالغ فيها"},
            {"id": 28, "text": "تعتريني حالات ضحك لا أفهم سببها", "reverse_scored": True},
            {"id": 29, "text": "أتفاعل مع الآخرين عندما يعبرون عن مشاعرهم"},
            {"id": 30, "text": "أتضايق من عدم قدرتي على التعبير بوضوح عما أشعر به", "reverse_scored": True},
            {"id": 31, "text": "عندما يخالفني شخص في الرأي أتضايق وأكره هذا الشخص", "reverse_scored": True},
            {"id": 32, "text": "استطيع تغيير انفعالاتي حسب الموقف", "reverse_scored": True},
            {"id": 33, "text": "عندما يغضب الشخص الذي أمامي أدرك أنه غاضب", "reverse_scored": True},
            {"id": 34, "text": "يجعلني انفعالي ارتكب الأخطاء", "reverse_scored": True},
            {"id": 35, "text": "اغضب دون سبب"},
            {"id": 36, "text": "اشعر بالضيق والحزن بشكل مفاجئ"},
            {"id": 37, "text": "أستطيع ان أسيطر على غضبي", "reverse_scored": True},
            {"id": 38, "text": "مشاعري تظهر في الوقت المناسب والموضع المناسب", "reverse_scored": True},
            {"id": 39, "text": "ترتفع لدي روح المغامرة وعدم التفكير في العواقب عندما أكون سعيدة"},
            {"id": 40, "text": "استطيع التنبؤ بالمواقف التي تثير حزن زميلتي"},
            {"id": 41, "text": "عندما انقل لصديقتي خبراً ساراً اعرف مسبقاً أنها ستكون سعيدة"},
            {"id": 42, "text": "استطيع التمييز بين شعوري بالضيق وشعوري بالفرح", "reverse_scored": True},
            {"id": 43, "text": "يستطيع من حولي استثارتي بسهولة", "reverse_scored": True},
            {"id": 44, "text": "أفقد السيطرة على أعصابي عندما أتضايق", "reverse_scored": True},
            {"id": 45, "text": "احرص على ان تكون مشاعري مناسبة للمكان والزمان اللذان أكون فيهما"},
        ],
    },
    "scoring_rules": {
        "type": "sum_with_reverse",
        "reverse_items": [3, 4, 8, 9, 10, 12, 16, 18, 19, 21, 28, 30, 31, 32, 33, 34, 37, 38, 42, 43, 44],
        "reverse_formula": "6 - value",
        "min": 45,
        "max": 225,
    },
    "interpretation_rules": None,
    "risk_rules": None,
    "notes": "Digitized from Dr. Heba's own PDF (real 45-item text extracted, not fabricated). IMPORTANT DISCREPANCY: the source document's own reverse-scoring key lists items up to #56, but only 45 items appear in the pages provided -- either pages are missing from the PDF or the source itself is incomplete. Reverse items above are limited to those confirmed to exist within items 1-45; do not treat this as the complete original instrument until the missing pages (46-56, if they exist) are located and reviewed. Owner-scoped to Dr. Heba's account only. No interpretation bands set -- raw score only until Dr. Heba confirms the scoring/norms used alongside this instrument.",
}

ASSESSMENTS = [YBOCS, EI_SCALE]


async def seed(conn: asyncpg.Connection, org_id: str, admin_id: str, owner_id: str) -> None:
    for a in ASSESSMENTS:
        existing = await conn.fetchrow(
            "SELECT id FROM assessment_catalog WHERE org_id = $1 AND template_key = $2",
            uuid.UUID(org_id), a["template_key"],
        )
        if existing:
            catalog_id = existing["id"]
            print(f"  catalog entry exists for {a['template_key']}: {catalog_id}")
        else:
            catalog_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO assessment_catalog (
                    id, org_id, template_key, name, template_type,
                    license_status, description, owner_user_id, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                catalog_id, uuid.UUID(org_id), a["template_key"], a["name"],
                a["template_type"], a["license_status"], a["description"],
                uuid.UUID(owner_id), uuid.UUID(admin_id),
            )
            print(f"  created catalog entry for {a['template_key']}: {catalog_id} (owner={owner_id})")

        version_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO assessment_versions (
                id, catalog_id, version_number, status, name, template_type,
                license_status, definition_json, scoring_rules, interpretation_rules,
                risk_rules, delivery, notes, created_by, published_at, published_by
            )
            VALUES ($1, $2, 1, 'published', $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, NOW(), $12)
            """,
            version_id, catalog_id, a["name"], a["template_type"], a["license_status"],
            json.dumps(a["definition_json"]),
            json.dumps(a["scoring_rules"]),
            json.dumps(a["interpretation_rules"]) if a["interpretation_rules"] is not None else None,
            json.dumps(a["risk_rules"]) if a["risk_rules"] is not None else None,
            a["delivery"],
            a.get("notes"),
            uuid.UUID(admin_id),
        )
        await conn.execute(
            "UPDATE assessment_catalog SET current_published_version_id = $1, updated_at = NOW() WHERE id = $2",
            version_id, catalog_id,
        )
        print(f"  published version 1 for {a['template_key']}: {version_id}")


async def main() -> None:
    dsn = os.environ["DATABASE_URL"]
    org_id = os.environ["SEED_ORG_ID"]
    admin_id = os.environ["SEED_ADMIN_ID"]
    owner_id = os.environ["SEED_OWNER_ID"]
    conn = await asyncpg.connect(dsn=dsn)
    try:
        await seed(conn, org_id, admin_id, owner_id)
    finally:
        await conn.close()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
