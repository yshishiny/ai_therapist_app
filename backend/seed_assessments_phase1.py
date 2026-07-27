"""
seed_assessments_phase1.py — Seed the Phase 1 assessment catalog
------------------------------------------------------------------
Populates assessment_catalog + assessment_versions with full, real
content for the four Tier-1 (free / public-domain) instruments:
PHQ-9, GAD-7, PSS-10, WHO-5.

These are all confirmed free to reproduce and score without a license:
- PHQ-9, GAD-7: public domain (Pfizer / Spitzer, Kroenke & Williams)
- WHO-5: WHO Regional Office for Europe, free for clinical/research use
- PSS-10: Cohen's Perceived Stress Scale, freely available for clinical/research use

Deliberately does NOT include Beck, Hamilton, MMPI, or other licensed
instruments — those require permission/purchase and their proprietary
item text should not be reproduced without a license.

Usage:
    DATABASE_URL=postgresql://... python seed_assessments_phase1.py
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

PHQ9 = {
    "template_key": "phq9",
    "legacy_template_id": "phq9",
    "name": "PHQ-9",
    "description": "Patient Health Questionnaire-9 — depression severity screening.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "definition_json": {
        "instructions": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
        "questions": [
            {"id": 1, "text": "Little interest or pleasure in doing things", "type": "likert", "options": LIKERT_0_3},
            {"id": 2, "text": "Feeling down, depressed, or hopeless", "type": "likert", "options": LIKERT_0_3},
            {"id": 3, "text": "Trouble falling or staying asleep, or sleeping too much", "type": "likert", "options": LIKERT_0_3},
            {"id": 4, "text": "Feeling tired or having little energy", "type": "likert", "options": LIKERT_0_3},
            {"id": 5, "text": "Poor appetite or overeating", "type": "likert", "options": LIKERT_0_3},
            {"id": 6, "text": "Feeling bad about yourself — or that you are a failure or have let yourself or your family down", "type": "likert", "options": LIKERT_0_3},
            {"id": 7, "text": "Trouble concentrating on things, such as reading the newspaper or watching television", "type": "likert", "options": LIKERT_0_3},
            {"id": 8, "text": "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual", "type": "likert", "options": LIKERT_0_3},
            {"id": 9, "text": "Thoughts that you would be better off dead, or of hurting yourself in some way", "type": "likert", "options": LIKERT_0_3},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 27},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 4, "label": "Minimal"},
            {"min": 5, "max": 9, "label": "Mild"},
            {"min": 10, "max": 14, "label": "Moderate"},
            {"min": 15, "max": 19, "label": "Moderately severe"},
            {"min": 20, "max": 27, "label": "Severe"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "phq9_item9_suicide_flag",
                "condition": "question_9 >= 1",
                "risk_level": "HIGH",
                "flag": "SUICIDE_RISK",
                "message": "Patient endorsed Item 9 (thoughts of self-harm or being better off dead). Assess suicide risk immediately.",
            }
        ]
    },
}

GAD7 = {
    "template_key": "gad7",
    "legacy_template_id": "gad7",
    "name": "GAD-7",
    "description": "Generalized Anxiety Disorder-7 — anxiety severity screening.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "definition_json": {
        "instructions": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
        "questions": [
            {"id": 1, "text": "Feeling nervous, anxious, or on edge", "type": "likert", "options": LIKERT_0_3},
            {"id": 2, "text": "Not being able to stop or control worrying", "type": "likert", "options": LIKERT_0_3},
            {"id": 3, "text": "Worrying too much about different things", "type": "likert", "options": LIKERT_0_3},
            {"id": 4, "text": "Trouble relaxing", "type": "likert", "options": LIKERT_0_3},
            {"id": 5, "text": "Being so restless that it is hard to sit still", "type": "likert", "options": LIKERT_0_3},
            {"id": 6, "text": "Becoming easily annoyed or irritable", "type": "likert", "options": LIKERT_0_3},
            {"id": 7, "text": "Feeling afraid, as if something awful might happen", "type": "likert", "options": LIKERT_0_3},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 21},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 4, "label": "Minimal"},
            {"min": 5, "max": 9, "label": "Mild"},
            {"min": 10, "max": 14, "label": "Moderate"},
            {"min": 15, "max": 21, "label": "Severe"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "gad7_severe_flag",
                "condition": "total_score >= 15",
                "risk_level": "MEDIUM",
                "flag": "SEVERE_ANXIETY",
                "message": "Score in the severe range (≥15). Consider prioritizing follow-up.",
            }
        ]
    },
}

PSS10 = {
    "template_key": "pss10",
    "legacy_template_id": "pss10",
    "name": "PSS-10",
    "description": "Perceived Stress Scale (10-item) — perceived stress over the past month.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "definition_json": {
        "instructions": "In the last month, how often have you felt or thought a certain way?",
        "options": [
            {"value": 0, "label": "Never"},
            {"value": 1, "label": "Almost never"},
            {"value": 2, "label": "Sometimes"},
            {"value": 3, "label": "Fairly often"},
            {"value": 4, "label": "Very often"},
        ],
        "questions": [
            {"id": 1, "text": "Been upset because of something that happened unexpectedly", "type": "likert", "reverse_scored": False},
            {"id": 2, "text": "Felt that you were unable to control the important things in your life", "type": "likert", "reverse_scored": False},
            {"id": 3, "text": "Felt nervous and stressed", "type": "likert", "reverse_scored": False},
            {"id": 4, "text": "Felt confident about your ability to handle your personal problems", "type": "likert", "reverse_scored": True},
            {"id": 5, "text": "Felt that things were going your way", "type": "likert", "reverse_scored": True},
            {"id": 6, "text": "Found that you could not cope with all the things that you had to do", "type": "likert", "reverse_scored": False},
            {"id": 7, "text": "Been able to control irritations in your life", "type": "likert", "reverse_scored": True},
            {"id": 8, "text": "Felt that you were on top of things", "type": "likert", "reverse_scored": True},
            {"id": 9, "text": "Been angered because of things that were outside of your control", "type": "likert", "reverse_scored": False},
            {"id": 10, "text": "Felt difficulties were piling up so high that you could not overcome them", "type": "likert", "reverse_scored": False},
        ],
    },
    "scoring_rules": {"type": "sum_with_reverse", "reverse_items": [4, 5, 7, 8], "reverse_formula": "4 - value", "min": 0, "max": 40},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 13, "label": "Low stress"},
            {"min": 14, "max": 26, "label": "Moderate stress"},
            {"min": 27, "max": 40, "label": "High stress"},
        ]
    },
    "risk_rules": None,
}

WHO5 = {
    "template_key": "who5",
    "legacy_template_id": "who5",
    "name": "WHO-5",
    "description": "WHO-5 Well-Being Index — general wellbeing screening.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "definition_json": {
        "instructions": "Please indicate for each of the five statements which is closest to how you have been feeling over the last two weeks. Higher numbers mean better wellbeing.",
        "options": [
            {"value": 0, "label": "At no time"},
            {"value": 1, "label": "Some of the time"},
            {"value": 2, "label": "Less than half of the time"},
            {"value": 3, "label": "More than half of the time"},
            {"value": 4, "label": "Most of the time"},
            {"value": 5, "label": "All of the time"},
        ],
        "questions": [
            {"id": 1, "text": "I have felt cheerful and in good spirits", "type": "likert"},
            {"id": 2, "text": "I have felt calm and relaxed", "type": "likert"},
            {"id": 3, "text": "I have felt active and vigorous", "type": "likert"},
            {"id": 4, "text": "I woke up feeling fresh and rested", "type": "likert"},
            {"id": 5, "text": "My daily life has been filled with things that interest me", "type": "likert"},
        ],
    },
    "scoring_rules": {"type": "sum_times_multiplier", "multiplier": 4, "raw_min": 0, "raw_max": 25, "min": 0, "max": 100},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 50, "label": "Poor wellbeing — screen for depression"},
            {"min": 51, "max": 100, "label": "Adequate wellbeing"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "who5_low_wellbeing",
                "condition": "total_score <= 50",
                "risk_level": "MEDIUM",
                "flag": "LOW_WELLBEING",
                "message": "Score ≤50% suggests possible depression — consider a PHQ-9 follow-up.",
            }
        ]
    },
}

PHASE1_ASSESSMENTS = [PHQ9, GAD7, PSS10, WHO5]


async def seed(conn: asyncpg.Connection, org_id: str, admin_id: str) -> None:
    for a in PHASE1_ASSESSMENTS:
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
                risk_rules, delivery, created_by, published_at, published_by
            )
            VALUES ($1, $2, 1, 'published', $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, 'IN_APP', $10, NOW(), $10)
            """,
            version_id, catalog_id, a["name"], a["template_type"], a["license_status"],
            json.dumps(a["definition_json"]),
            json.dumps(a["scoring_rules"]),
            json.dumps(a["interpretation_rules"]),
            json.dumps(a["risk_rules"]) if a["risk_rules"] is not None else None,
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
