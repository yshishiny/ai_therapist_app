"""
seed_assessments_phase3.py — Seed Phase 3 of the assessment catalog
------------------------------------------------------------------
Five more real, free/public-domain instruments, added where accurate
item text could be reproduced with high confidence:

- GAD-2   — 2-item ultra-brief anxiety screener (first two GAD-7 items,
            same public-domain lineage)
- ASRS Part A — WHO Adult ADHD Self-Report Scale, 6-item screener
            (Kessler et al., WHO; free for clinical/research use)
- SCOFF   — 5-item eating-disorder screener (Morgan, Reid & Lacey,
            BMJ 1999; short and widely reproduced free of charge)
- DAST-10 — Drug Abuse Screening Test, 10-item short form (Skinner,
            1982; free short-form in wide clinical use)
- RAS     — Relationship Assessment Scale, 7-item satisfaction
            measure (Hendrick, 1988; free for research/clinical use)

Deliberately deferred (not included here): MDI, PSQI, TSQ, SDQ, RCADS
-- moderate-only confidence in exact source wording (MDI, PSQI) or
redundant with instruments already live (TSQ vs PCL-5, PSQI vs SDI-7),
and pediatric content (SDQ, RCADS) held back pending a verified source
rather than reproduced from memory.

Usage:
    DATABASE_URL=postgresql://... SEED_ORG_ID=... SEED_ADMIN_ID=... python seed_assessments_phase3.py
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid

import asyncpg

LIKERT_0_3 = [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "Several days"},
    {"value": 2, "label": "More than half the days"},
    {"value": 3, "label": "Nearly every day"},
]

ASRS_FREQ = [
    {"value": 0, "label": "Never"},
    {"value": 1, "label": "Rarely"},
    {"value": 2, "label": "Sometimes"},
    {"value": 3, "label": "Often"},
    {"value": 4, "label": "Very often"},
]

YES_NO = [
    {"value": 0, "label": "No"},
    {"value": 1, "label": "Yes"},
]

RAS_SCALE = [
    {"value": 1, "label": "Low / not at all"},
    {"value": 2, "label": "Somewhat low"},
    {"value": 3, "label": "Moderate"},
    {"value": 4, "label": "Somewhat high"},
    {"value": 5, "label": "High / very much"},
]

# ---------------------------------------------------------------------------
GAD2 = {
    "template_key": "gad2",
    "legacy_template_id": None,
    "name": "GAD-2",
    "description": "2-item ultra-brief anxiety screener — the first two GAD-7 items, same public-domain lineage.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Over the last 2 weeks, how often have you been bothered by the following problems?",
        "questions": [
            {"id": 1, "text": "Feeling nervous, anxious, or on edge", "type": "single_choice", "options": LIKERT_0_3},
            {"id": 2, "text": "Not being able to stop or control worrying", "type": "single_choice", "options": LIKERT_0_3},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 6},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 2, "label": "Negative screen"},
            {"min": 3, "max": 6, "label": "Positive screen — follow up with the full GAD-7"},
        ]
    },
    "risk_rules": None,
    "notes": "Public domain, same lineage as PHQ-9/GAD-7 (Spitzer, Kroenke & Williams). Cutoff of 3 is the standard validated GAD-2 threshold.",
}

ASRS_A = {
    "template_key": "asrs_a",
    "legacy_template_id": None,
    "name": "ASRS v1.1 Part A (ADHD Screener)",
    "description": "WHO Adult ADHD Self-Report Scale, Part A — the 6 most predictive screening items.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Please answer the questions below, rating yourself on each of the criteria shown using the scale on the right side of the page. As you answer each question, place an X in the box that best describes how you have felt and conducted yourself over the past 6 months.",
        "questions": [
            {"id": 1, "text": "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?", "type": "single_choice", "options": ASRS_FREQ},
            {"id": 2, "text": "How often do you have difficulty getting things in order when you have to do a task that requires organization?", "type": "single_choice", "options": ASRS_FREQ},
            {"id": 3, "text": "How often do you have problems remembering appointments or obligations?", "type": "single_choice", "options": ASRS_FREQ},
            {"id": 4, "text": "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?", "type": "single_choice", "options": ASRS_FREQ},
            {"id": 5, "text": "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?", "type": "single_choice", "options": ASRS_FREQ},
            {"id": 6, "text": "How often do you feel overly active and compelled to do things, like you were driven by a motor?", "type": "single_choice", "options": ASRS_FREQ},
        ],
    },
    "scoring_rules": {
        "type": "threshold_count",
        "thresholds": {"1": 2, "2": 2, "3": 2, "4": 3, "5": 3, "6": 3},
        "min": 0,
        "max": 6,
    },
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 3, "label": "Below threshold — ADHD symptoms less likely"},
            {"min": 4, "max": 6, "label": "At or above threshold — symptoms highly consistent with adult ADHD; further evaluation recommended"},
        ]
    },
    "risk_rules": None,
    "notes": "Items 1-3 count as positive at 'Sometimes' or higher; items 4-6 count as positive at 'Often' or higher (per the official Part A scoring key). Free WHO/Kessler-developed screener. This is the 6-item Part A screener only, not the full 18-item ASRS v1.1.",
}

SCOFF = {
    "template_key": "scoff",
    "legacy_template_id": None,
    "name": "SCOFF",
    "description": "5-item eating-disorder screening questionnaire (Morgan, Reid & Lacey, BMJ 1999).",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Please answer each question with Yes or No.",
        "questions": [
            {"id": 1, "text": "Do you make yourself Sick because you feel uncomfortably full?", "type": "single_choice", "options": YES_NO},
            {"id": 2, "text": "Do you worry you have lost Control over how much you eat?", "type": "single_choice", "options": YES_NO},
            {"id": 3, "text": "Have you recently lost more than One stone (about 6.4 kg / 14 lbs) in a 3-month period?", "type": "single_choice", "options": YES_NO},
            {"id": 4, "text": "Do you believe yourself to be Fat when others say you are too thin?", "type": "single_choice", "options": YES_NO},
            {"id": 5, "text": "Would you say that Food dominates your life?", "type": "single_choice", "options": YES_NO},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 5},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 1, "label": "Unlikely to indicate an eating disorder"},
            {"min": 2, "max": 5, "label": "Positive screen — further clinical assessment for an eating disorder is recommended"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "scoff_positive_screen",
                "condition": "total_score >= 2",
                "risk_level": "MEDIUM",
                "flag": "POSSIBLE_EATING_DISORDER",
                "message": "Positive SCOFF screen (score >= 2) — recommend further clinical assessment for an eating disorder.",
            }
        ]
    },
    "notes": "Public domain, short validated screener; free and widely reproduced in clinical practice.",
}

DAST10 = {
    "template_key": "dast10",
    "legacy_template_id": None,
    "name": "DAST-10",
    "description": "Drug Abuse Screening Test (10-item short form, Skinner 1982) — drug use problem severity.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "The following questions concern information about your involvement with drugs, not including alcohol or tobacco, over the past 12 months. Please answer Yes or No to each question.",
        "questions": [
            {"id": 1, "text": "Have you used drugs other than those required for medical reasons?", "type": "single_choice", "options": YES_NO},
            {"id": 2, "text": "Do you abuse more than one drug at a time?", "type": "single_choice", "options": YES_NO},
            {"id": 3, "text": "Are you always able to stop using drugs when you want to?", "type": "single_choice", "options": YES_NO, "reverse_scored": True},
            {"id": 4, "text": "Have you had \"blackouts\" or \"flashbacks\" as a result of drug use?", "type": "single_choice", "options": YES_NO},
            {"id": 5, "text": "Do you ever feel bad or guilty about your drug use?", "type": "single_choice", "options": YES_NO},
            {"id": 6, "text": "Does your spouse, partner, or parents ever complain about your involvement with drugs?", "type": "single_choice", "options": YES_NO},
            {"id": 7, "text": "Have you neglected your family because of your use of drugs?", "type": "single_choice", "options": YES_NO},
            {"id": 8, "text": "Have you engaged in illegal activities in order to obtain drugs?", "type": "single_choice", "options": YES_NO},
            {"id": 9, "text": "Have you ever experienced withdrawal symptoms (felt sick) when you stopped taking drugs?", "type": "single_choice", "options": YES_NO},
            {"id": 10, "text": "Have you had medical problems as a result of your drug use (e.g., memory loss, hepatitis, convulsions, bleeding)?", "type": "single_choice", "options": YES_NO},
        ],
    },
    "scoring_rules": {
        "type": "sum_with_reverse",
        "reverse_items": [3],
        "reverse_formula": "1 - value",
        "min": 0,
        "max": 10,
    },
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 0, "label": "No problems reported"},
            {"min": 1, "max": 2, "label": "Low level"},
            {"min": 3, "max": 5, "label": "Moderate level"},
            {"min": 6, "max": 8, "label": "Substantial level"},
            {"min": 9, "max": 10, "label": "Severe level"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "dast10_substantial",
                "condition": "total_score >= 6",
                "risk_level": "MEDIUM",
                "flag": "SUBSTANTIAL_DRUG_USE",
                "message": "Score indicates substantial to severe drug-related problems — recommend further assessment and referral.",
            }
        ]
    },
    "notes": "Free short-form in wide clinical use, structurally the drug-use analog of AUDIT.",
}

RAS = {
    "template_key": "ras",
    "legacy_template_id": None,
    "name": "RAS (Relationship Assessment Scale)",
    "description": "7-item relationship satisfaction scale (Hendrick, 1988).",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Please rate each statement about your current relationship on a scale from low to high.",
        "questions": [
            {"id": 1, "text": "How well does your partner meet your needs?", "type": "single_choice", "options": RAS_SCALE},
            {"id": 2, "text": "In general, how satisfied are you with your relationship?", "type": "single_choice", "options": RAS_SCALE},
            {"id": 3, "text": "How good is your relationship compared to most?", "type": "single_choice", "options": RAS_SCALE},
            {"id": 4, "text": "How often do you wish you hadn't gotten into this relationship?", "type": "single_choice", "options": RAS_SCALE, "reverse_scored": True},
            {"id": 5, "text": "To what extent has your relationship met your original expectations?", "type": "single_choice", "options": RAS_SCALE},
            {"id": 6, "text": "How much do you love your partner?", "type": "single_choice", "options": RAS_SCALE},
            {"id": 7, "text": "How many problems are there in your relationship?", "type": "single_choice", "options": RAS_SCALE, "reverse_scored": True},
        ],
    },
    "scoring_rules": {
        "type": "sum_with_reverse",
        "reverse_items": [4, 7],
        "reverse_formula": "6 - value",
        "min": 7,
        "max": 35,
    },
    "interpretation_rules": {
        "bands": [
            {"min": 7, "max": 13, "label": "Low relationship satisfaction"},
            {"min": 14, "max": 24, "label": "Moderate relationship satisfaction"},
            {"min": 25, "max": 35, "label": "High relationship satisfaction"},
        ]
    },
    "risk_rules": None,
    "notes": "Free for research/clinical use. Bands here are descriptive tertiles over the 7-35 range, not an officially standardized clinical cutoff (RAS is a continuous satisfaction measure, not a diagnostic instrument).",
}

PHASE3_ASSESSMENTS = [GAD2, ASRS_A, SCOFF, DAST10, RAS]


async def seed(conn: asyncpg.Connection, org_id: str, admin_id: str) -> None:
    for a in PHASE3_ASSESSMENTS:
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
                    id, org_id, template_key, legacy_template_id, name,
                    template_type, license_status, description, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                catalog_id, uuid.UUID(org_id), a["template_key"], a["legacy_template_id"],
                a["name"], a["template_type"], a["license_status"], a["description"],
                uuid.UUID(admin_id),
            )
            print(f"  created catalog entry for {a['template_key']}: {catalog_id}")

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
            json.dumps(a["interpretation_rules"]),
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
    conn = await asyncpg.connect(dsn=dsn)
    try:
        await seed(conn, org_id, admin_id)
    finally:
        await conn.close()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
