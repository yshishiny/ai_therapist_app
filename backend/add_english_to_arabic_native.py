"""
add_english_to_arabic_native.py — Add English to the Arabic-native instruments
------------------------------------------------------------------
Y-BOCS (ybocs_ar) and the Emotional Intelligence Scale (ei_scale_ar) were
seeded with Arabic as the primary `text`. This restructures both to the
same text/text_ar convention as add_bilingual_content.py: `text` becomes
English, `text_ar` holds the original Arabic (unchanged, still Dr.
Heba's real source content -- only English is newly added here).

Usage:
    DATABASE_URL=postgresql://... python add_english_to_arabic_native.py
"""

from __future__ import annotations

import asyncio
import json
import os

import asyncpg

CLINICIAN_ANCHORS_EN = [
    {"value": 0, "label": "Nothing"},
    {"value": 1, "label": "Mild (<1hr/day)"},
    {"value": 2, "label": "Moderate (1-3hr/day)"},
    {"value": 3, "label": "Severe (3-8hr/day)"},
    {"value": 4, "label": "Extreme (>8hr/day)"},
]

# Y-BOCS: same option set is reused across items 1/6 (time), 2/7 (interference),
# 3/8 (distress), 4/9 (resistance), 5/10 (control) -- English anchors matching
# the real Y-BOCS structure, paired positionally with the existing Arabic options.
YBOCS_QUESTIONS_EN = {
    1: "Amount of time occupied by obsessive thoughts",
    2: "Interference due to obsessive thoughts",
    3: "Distress associated with obsessive thoughts",
    4: "Resistance against obsessions",
    5: "Degree of control over obsessive thoughts",
    6: "Amount of time spent performing compulsive behaviors",
    7: "Interference due to compulsive behaviors",
    8: "Distress associated with compulsive behavior",
    9: "Resistance against compulsions",
    10: "Degree of control over compulsive behavior",
}

YBOCS_OPTION_LABELS_EN = {
    "TIME": ["None", "Less than 1 hr/day, or occasional occurrence", "1 to 3 hrs/day, or frequent occurrence", "3 to 8 hrs/day, or very frequent occurrence", "More than 8 hrs/day, or near-constant occurrence"],
    "INTERFERENCE": ["None", "Mild, slight interference, overall functioning not affected", "Moderate, clear interference but manageable", "Severe, causes substantial impairment", "Extreme, incapacitating"],
    "DISTRESS": ["None", "Mild, not too disturbing", "Moderate, disturbing but manageable", "Severe, very disturbing", "Extreme, near-constant and disabling distress"],
    "RESISTANCE": ["Always resists, or symptoms so minimal no resistance needed", "Tries to resist most of the time", "Makes some effort to resist", "Yields to all such thoughts/behaviors without attempting to control them, but with some reluctance", "Completely and willingly yields to all obsessions/compulsions"],
    "CONTROL": ["Complete control", "Much control, usually able to stop or divert obsessions/compulsions with some effort", "Moderate control, sometimes able to stop or divert", "Little control, rarely successful, can only divert attention with difficulty", "No control, rarely even able to momentarily divert"],
}

YBOCS_ITEM_TYPE = {
    1: "TIME", 2: "INTERFERENCE", 3: "DISTRESS", 4: "RESISTANCE", 5: "CONTROL",
    6: "TIME", 7: "INTERFERENCE", 8: "DISTRESS", 9: "RESISTANCE", 10: "CONTROL",
}


async def update_ybocs(conn: asyncpg.Connection) -> None:
    row = await conn.fetchrow(
        """
        SELECT av.id, av.definition_json
        FROM assessment_catalog ac
        JOIN assessment_versions av ON av.id = ac.current_published_version_id
        WHERE ac.template_key = 'ybocs_ar'
        """
    )
    if not row:
        print("  SKIP ybocs_ar: not found")
        return
    data = json.loads(row["definition_json"]) if isinstance(row["definition_json"], str) else row["definition_json"]

    data["instructions_ar"] = data["instructions"]
    data["instructions"] = "Including today, mark the box for the number that best describes how often obsessions/compulsions occurred over the past 7 days."

    for question in data["questions"]:
        qid = question["id"]
        question["text_ar"] = question["text"]
        question["text"] = YBOCS_QUESTIONS_EN[qid]
        item_type = YBOCS_ITEM_TYPE[qid]
        en_labels = YBOCS_OPTION_LABELS_EN[item_type]
        for opt, en_label in zip(question["options"], en_labels):
            opt["label_ar"] = opt["label"]
            opt["label"] = en_label

    await conn.execute(
        """
        UPDATE assessment_versions
        SET definition_json = $1::jsonb,
            notes = COALESCE(notes || ' ', '') || 'English added alongside the original Arabic (AI-assisted, authored directly) -- please spot-check.'
        WHERE id = $2
        """,
        json.dumps(data), row["id"],
    )
    print(f"  updated ybocs_ar: {row['id']}")


EI_QUESTIONS_EN = {
    1: "When I'm happy, I act without caution and without thinking",
    2: "I talk to others without considering their mood",
    3: "My sadness when I make a mistake makes me reconsider my mistake and be careful not to repeat it",
    4: "I postpone planning for things that require focus until times when I'm in a good mood",
    5: "I can maintain my calm even when I'm upset",
    6: "I ruin happy moments when a minor situation that bothers me happens during them",
    7: "I have fear attacks whose source I'm not aware of",
    8: "I may shift without justification from mild distress to intense sadness",
    9: "I recognize in advance the situations that provoke my anger",
    10: "I avoid getting into discussions when I'm in a bad mood",
    11: "I show my joy when given a gift even if I don't like it",
    12: "I express my feelings without considering others",
    13: "I can shift from bad feelings to positive ones depending on the situation",
    14: "My fear of certain things confuses me when dealing with them",
    15: "When I make a mistake, I get upset which prevents me from thinking clearly",
    16: "I distinguish between the different emotions of others",
    17: "I find it difficult to understand others' feelings",
    18: "I have a high ability to describe what I feel",
    19: "I can distinguish between real and feigned sadness",
    20: "I recognize in advance which situations will please me and which will upset me",
    21: "I control my emotions",
    22: "If I face a problem and become tense, I postpone solving it until my mood improves",
    23: "My anxiety hinders me from completing some tasks well",
    24: "I understand others' emotions and deal with them appropriately",
    25: "My mood affects my performance level",
    26: "I lack the ability to deal with my feelings in a way that suits situations",
    27: "I feel excessive fear of certain things",
    28: "I have bouts of laughter whose reason I don't understand",
    29: "I interact with others when they express their feelings",
    30: "I get upset by my inability to clearly express what I feel",
    31: "When someone disagrees with me, I get upset and dislike that person",
    32: "I can change my emotions according to the situation",
    33: "When the person in front of me gets angry, I recognize that they are angry",
    34: "My emotions make me commit mistakes",
    35: "I get angry without reason",
    36: "I feel sudden distress and sadness",
    37: "I am able to control my anger",
    38: "My feelings appear at the right time and place",
    39: "I have a sense of adventure and disregard for consequences when I'm happy",
    40: "I can predict the situations that upset my colleague",
    41: "When I convey good news to my friend, I know in advance that she will be happy",
    42: "I can distinguish between my feeling of distress and my feeling of joy",
    43: "Those around me can provoke me easily",
    44: "I lose control of my nerves when I'm upset",
    45: "I make sure my feelings are appropriate for the place and time I'm in",
}

EI_OPTIONS_EN = ["Never", "Rarely", "Sometimes", "Often", "Always"]


async def update_ei_scale(conn: asyncpg.Connection) -> None:
    row = await conn.fetchrow(
        """
        SELECT av.id, av.definition_json
        FROM assessment_catalog ac
        JOIN assessment_versions av ON av.id = ac.current_published_version_id
        WHERE ac.template_key = 'ei_scale_ar'
        """
    )
    if not row:
        print("  SKIP ei_scale_ar: not found")
        return
    data = json.loads(row["definition_json"]) if isinstance(row["definition_json"], str) else row["definition_json"]

    data["instructions_ar"] = data["instructions"]
    data["instructions"] = "Choose the option that best describes your state: Always, Often, Sometimes, Rarely, Never."

    data["options_ar"] = data["options"]
    for opt, en_label in zip(data["options"], EI_OPTIONS_EN):
        opt["label_ar"] = opt["label"]
        opt["label"] = en_label

    for question in data["questions"]:
        qid = question["id"]
        question["text_ar"] = question["text"]
        question["text"] = EI_QUESTIONS_EN[qid]

    await conn.execute(
        """
        UPDATE assessment_versions
        SET definition_json = $1::jsonb,
            notes = COALESCE(notes || ' ', '') || 'English added alongside the original Arabic (AI-assisted, authored directly) -- please spot-check.'
        WHERE id = $2
        """,
        json.dumps(data), row["id"],
    )
    print(f"  updated ei_scale_ar: {row['id']}")


async def main() -> None:
    dsn = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(dsn=dsn)
    try:
        await update_ybocs(conn)
        await update_ei_scale(conn)
    finally:
        await conn.close()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
