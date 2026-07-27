"""
seed_assessments_phase2.py — Seed Phase 2 of the assessment catalog
------------------------------------------------------------------
Two content tiers, both legally clean to reproduce today:

1) Real, free/public-domain instruments (accurate published item text):
   - AUDIT  — WHO Alcohol Use Disorders Identification Test
   - PCL-5  — PTSD Checklist for DSM-5 (U.S. National Center for PTSD)

2) Original instruments authored for this platform — NOT reproductions
   of any copyrighted or restricted instrument. These cover the same
   general clinical domains as commercial scales (Beck Depression/
   Anxiety Inventories, Hamilton Depression/Anxiety Rating Scales,
   Insomnia Severity Index) using independently written items,
   independently set response wording, and independently set scoring
   bands:
   - Sleep Difficulty Index (SDI-7)              — insomnia-severity domain
   - Mood Pattern Inventory (MPI-21)              — depression-severity domain
   - Anxiety Pattern Inventory (API-10)           — somatic anxiety domain
   - Clinician-Rated Depression Severity (CDSS-14) — clinician-administered
   - Clinician-Rated Anxiety Severity (CASS-13)    — clinician-administered

3) Copenhagen Burnout Inventory (CBI) — a real, validated burnout
   instrument released for free use by Denmark's National Institute of
   Occupational Health, specifically as an open alternative to the
   commercially-restricted Maslach Burnout Inventory. Same clinical
   construct (personal / work / client-related burnout), zero license
   needed.

Deliberately excluded: Beck (BDI-II, BAI, BSS), Hamilton (HAM-D, HAM-A),
and MMPI item content. These are commercially licensed or restricted
(MMPI is Level-C controlled and structurally cannot be licensed for
embedding in third-party software regardless of budget). If/when real
results from those instruments exist (administered via the publisher's
own licensed platform), record them as external_assessment_results
instead of reproducing their item text here.

Usage:
    DATABASE_URL=postgresql://... SEED_ORG_ID=... SEED_ADMIN_ID=... python seed_assessments_phase2.py
"""

from __future__ import annotations

import asyncio
import json
import os
import uuid

import asyncpg

FREQ_0_4 = [
    {"value": 0, "label": "Never"},
    {"value": 1, "label": "Less than monthly"},
    {"value": 2, "label": "Monthly"},
    {"value": 3, "label": "Weekly"},
    {"value": 4, "label": "Daily or almost daily"},
]

PCL5_OPTIONS = [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "A little bit"},
    {"value": 2, "label": "Moderately"},
    {"value": 3, "label": "Quite a bit"},
    {"value": 4, "label": "Extremely"},
]

ORIGINAL_0_3 = [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "Mild / some of the time"},
    {"value": 2, "label": "Moderate / much of the time"},
    {"value": 3, "label": "Severe / most or all of the time"},
]

SEVERITY_0_4 = [
    {"value": 0, "label": "None"},
    {"value": 1, "label": "Mild"},
    {"value": 2, "label": "Moderate"},
    {"value": 3, "label": "Severe"},
    {"value": 4, "label": "Very severe"},
]

CLINICIAN_0_4 = [
    {"value": 0, "label": "Absent"},
    {"value": 1, "label": "Doubtful / mild"},
    {"value": 2, "label": "Mild to moderate"},
    {"value": 3, "label": "Moderate to severe"},
    {"value": 4, "label": "Severe"},
]

CBI_SCALE = [
    {"value": 0, "label": "Never / almost never"},
    {"value": 25, "label": "Seldom"},
    {"value": 50, "label": "Sometimes"},
    {"value": 75, "label": "Often"},
    {"value": 100, "label": "Always"},
]

# ---------------------------------------------------------------------------
# 1) AUDIT — real WHO instrument, free to use
# ---------------------------------------------------------------------------
AUDIT = {
    "template_key": "audit",
    "legacy_template_id": None,
    "name": "AUDIT",
    "description": "Alcohol Use Disorders Identification Test — WHO screening for hazardous and harmful alcohol consumption.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Because alcohol use can affect health and can interfere with certain medications and treatments, it is important that we ask some questions about your use of alcohol. Your answers will remain confidential.",
        "questions": [
            {"id": 1, "text": "How often do you have a drink containing alcohol?", "type": "single_choice",
             "options": [{"value": 0, "label": "Never"}, {"value": 1, "label": "Monthly or less"}, {"value": 2, "label": "2-4 times a month"}, {"value": 3, "label": "2-3 times a week"}, {"value": 4, "label": "4 or more times a week"}]},
            {"id": 2, "text": "How many standard drinks containing alcohol do you have on a typical day when you are drinking?", "type": "single_choice",
             "options": [{"value": 0, "label": "1 or 2"}, {"value": 1, "label": "3 or 4"}, {"value": 2, "label": "5 or 6"}, {"value": 3, "label": "7 to 9"}, {"value": 4, "label": "10 or more"}]},
            {"id": 3, "text": "How often do you have six or more drinks on one occasion?", "type": "single_choice", "options": FREQ_0_4},
            {"id": 4, "text": "How often during the last year have you found that you were not able to stop drinking once you had started?", "type": "single_choice", "options": FREQ_0_4},
            {"id": 5, "text": "How often during the last year have you failed to do what was normally expected of you because of drinking?", "type": "single_choice", "options": FREQ_0_4},
            {"id": 6, "text": "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?", "type": "single_choice", "options": FREQ_0_4},
            {"id": 7, "text": "How often during the last year have you had a feeling of guilt or remorse after drinking?", "type": "single_choice", "options": FREQ_0_4},
            {"id": 8, "text": "How often during the last year have you been unable to remember what happened the night before because you had been drinking?", "type": "single_choice", "options": FREQ_0_4},
            {"id": 9, "text": "Have you or someone else been injured as a result of your drinking?", "type": "single_choice",
             "options": [{"value": 0, "label": "No"}, {"value": 2, "label": "Yes, but not in the last year"}, {"value": 4, "label": "Yes, during the last year"}]},
            {"id": 10, "text": "Has a relative, friend, doctor, or other health worker been concerned about your drinking or suggested you cut down?", "type": "single_choice",
             "options": [{"value": 0, "label": "No"}, {"value": 2, "label": "Yes, but not in the last year"}, {"value": 4, "label": "Yes, during the last year"}]},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 40},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 7, "label": "Low risk"},
            {"min": 8, "max": 14, "label": "Increasing risk (hazardous use)"},
            {"min": 15, "max": 19, "label": "High risk (harmful use likely)"},
            {"min": 20, "max": 40, "label": "Possible dependence — further assessment strongly recommended"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "audit_harm_indicator",
                "condition": "question_9 >= 2 OR question_10 >= 2",
                "risk_level": "MEDIUM",
                "flag": "ALCOHOL_HARM_INDICATOR",
                "message": "Patient reports harm or others' concern related to drinking. Prioritize follow-up.",
            },
            {
                "id": "audit_possible_dependence",
                "condition": "total_score >= 20",
                "risk_level": "HIGH",
                "flag": "POSSIBLE_DEPENDENCE",
                "message": "Score suggests possible alcohol dependence — refer for comprehensive assessment.",
            },
        ]
    },
    "notes": None,
}

# ---------------------------------------------------------------------------
# 2) PCL-5 — real U.S. National Center for PTSD instrument, public domain
# ---------------------------------------------------------------------------
PCL5 = {
    "template_key": "pcl5",
    "legacy_template_id": None,
    "name": "PCL-5",
    "description": "PTSD Checklist for DSM-5 — 20-item measure of PTSD symptoms (U.S. Department of Veterans Affairs, National Center for PTSD).",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and select how much you have been bothered by that problem in the past month.",
        "questions": [
            {"id": 1, "cluster": "intrusion", "text": "Repeated, disturbing, and unwanted memories of the stressful experience?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 2, "cluster": "intrusion", "text": "Repeated, disturbing dreams of the stressful experience?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 3, "cluster": "intrusion", "text": "Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 4, "cluster": "intrusion", "text": "Feeling very upset when something reminded you of the stressful experience?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 5, "cluster": "intrusion", "text": "Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 6, "cluster": "avoidance", "text": "Avoiding memories, thoughts, or feelings related to the stressful experience?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 7, "cluster": "avoidance", "text": "Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 8, "cluster": "negative_alterations", "text": "Trouble remembering important parts of the stressful experience?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 9, "cluster": "negative_alterations", "text": "Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 10, "cluster": "negative_alterations", "text": "Blaming yourself or someone else for the stressful experience or what happened after it?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 11, "cluster": "negative_alterations", "text": "Having strong negative feelings such as fear, horror, anger, guilt, or shame?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 12, "cluster": "negative_alterations", "text": "Loss of interest in activities that you used to enjoy?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 13, "cluster": "negative_alterations", "text": "Feeling distant or cut off from other people?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 14, "cluster": "negative_alterations", "text": "Trouble experiencing positive feelings (for example, being unable to feel happiness or have loving feelings for people close to you)?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 15, "cluster": "arousal_reactivity", "text": "Irritable behavior, angry outbursts, or acting aggressively?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 16, "cluster": "arousal_reactivity", "text": "Taking too many risks or doing things that could cause you harm?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 17, "cluster": "arousal_reactivity", "text": "Being \"superalert\" or watchful or on guard?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 18, "cluster": "arousal_reactivity", "text": "Feeling jumpy or easily startled?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 19, "cluster": "arousal_reactivity", "text": "Having difficulty concentrating?", "type": "single_choice", "options": PCL5_OPTIONS},
            {"id": 20, "cluster": "arousal_reactivity", "text": "Trouble falling or staying asleep?", "type": "single_choice", "options": PCL5_OPTIONS},
        ],
        "clusters": {
            "intrusion": [1, 2, 3, 4, 5],
            "avoidance": [6, 7],
            "negative_alterations": [8, 9, 10, 11, 12, 13, 14],
            "arousal_reactivity": [15, 16, 17, 18, 19, 20],
        },
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 80},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 20, "label": "Minimal symptoms"},
            {"min": 21, "max": 32, "label": "Sub-threshold — monitor"},
            {"min": 33, "max": 80, "label": "At or above probable-PTSD cutoff — full clinical assessment recommended"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "pcl5_probable_ptsd",
                "condition": "total_score >= 33",
                "risk_level": "MEDIUM",
                "flag": "PROBABLE_PTSD",
                "message": "Score at or above the standard PCL-5 cutoff (33). Recommend a structured clinical interview (e.g., CAPS-5).",
            }
        ]
    },
    "notes": "Public domain — U.S. Department of Veterans Affairs, National Center for PTSD. Cutoff of 33 reflects the commonly cited DSM-5 validation range (31-33); treat as a screening indicator, not a diagnosis.",
}

# ---------------------------------------------------------------------------
# 3) Sleep Difficulty Index (SDI-7) — original instrument
# ---------------------------------------------------------------------------
SDI = {
    "template_key": "sdi7",
    "legacy_template_id": None,
    "name": "Sleep Difficulty Index (SDI-7)",
    "description": "Original 7-item measure of insomnia/sleep-difficulty severity, independently authored for this platform.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Please rate the current severity of your sleep difficulties over the past two weeks.",
        "questions": [
            {"id": 1, "text": "Difficulty falling asleep", "type": "single_choice", "options": SEVERITY_0_4},
            {"id": 2, "text": "Difficulty staying asleep (waking during the night)", "type": "single_choice", "options": SEVERITY_0_4},
            {"id": 3, "text": "Waking up too early and being unable to get back to sleep", "type": "single_choice", "options": SEVERITY_0_4},
            {"id": 4, "text": "Dissatisfaction with your current sleep pattern", "type": "single_choice", "options": SEVERITY_0_4},
            {"id": 5, "text": "How noticeable your sleep problem is to others, in terms of your mood or how you function", "type": "single_choice", "options": SEVERITY_0_4},
            {"id": 6, "text": "How worried or distressed you feel about your current sleep difficulties", "type": "single_choice", "options": SEVERITY_0_4},
            {"id": 7, "text": "Interference with your daily functioning (energy, mood, concentration, work) caused by your sleep difficulties", "type": "single_choice", "options": SEVERITY_0_4},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 28},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 7, "label": "No clinically significant sleep difficulty"},
            {"min": 8, "max": 14, "label": "Mild sleep difficulty"},
            {"min": 15, "max": 21, "label": "Moderate sleep difficulty"},
            {"min": 22, "max": 28, "label": "Severe sleep difficulty — consider clinical follow-up"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "sdi7_severe",
                "condition": "total_score >= 22",
                "risk_level": "MEDIUM",
                "flag": "SEVERE_SLEEP_DIFFICULTY",
                "message": "Severe sleep-difficulty range — consider dedicated sleep assessment or referral.",
            }
        ]
    },
    "notes": "Original instrument authored for this platform. Covers the same clinical domains as commercial insomnia-severity measures (onset, maintenance, early waking, satisfaction, noticeability, worry, functional interference) using independently written items and scoring bands. Not a reproduction of any commercial instrument.",
}

# ---------------------------------------------------------------------------
# 4) Mood Pattern Inventory (MPI-21) — original, Beck-Depression-domain-equivalent
# ---------------------------------------------------------------------------
MPI = {
    "template_key": "mpi21",
    "legacy_template_id": None,
    "name": "Mood Pattern Inventory (MPI-21)",
    "description": "Original 21-item structured measure of depressive-symptom severity, independently authored for this platform.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Please rate how much each statement has applied to you over the past two weeks.",
        "questions": [
            {"id": 1, "text": "I feel sad or down more often than not.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 2, "text": "I feel discouraged about how things will turn out for me.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 3, "text": "I feel like I have failed at things more than most people.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 4, "text": "I get less enjoyment out of things I used to like doing.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 5, "text": "I feel guilty about things, even small ones, more than seems reasonable.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 6, "text": "I feel like I deserve to be punished for my mistakes.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 7, "text": "I feel disappointed in myself.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 8, "text": "I am harder on myself and more self-critical than I used to be.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 9, "text": "I have thoughts of harming myself, or that I would be better off not alive.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 10, "text": "I find myself crying more than usual, or feeling like crying but unable to.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 11, "text": "I feel more agitated or on edge than usual.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 12, "text": "I have lost interest in other people or activities I used to care about.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 13, "text": "I have a harder time making decisions than I used to.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 14, "text": "I feel that I am not worth very much as a person.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 15, "text": "I have less energy to get things done.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 16, "text": "My sleep has changed noticeably (too little or too much) recently.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 17, "text": "I feel more irritable than usual.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 18, "text": "My appetite has changed noticeably (too little or too much) recently.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 19, "text": "I have trouble concentrating on things like reading or conversations.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 20, "text": "I feel tired or worn out even without much physical effort.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 21, "text": "I've lost interest in closeness or intimacy with others.", "type": "single_choice", "options": ORIGINAL_0_3},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 63},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 9, "label": "Minimal"},
            {"min": 10, "max": 18, "label": "Mild"},
            {"min": 19, "max": 29, "label": "Moderate"},
            {"min": 30, "max": 63, "label": "Severe"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "mpi21_item9_suicide_flag",
                "condition": "question_9 >= 1",
                "risk_level": "HIGH",
                "flag": "SUICIDE_RISK",
                "message": "Patient endorsed Item 9 (thoughts of self-harm or not wanting to be alive). Assess suicide risk immediately.",
            }
        ]
    },
    "notes": "Original 21-item instrument authored for this platform, covering the same broad depression-symptom domains as commercial depression inventories (mood, self-view, motivation, somatic symptoms, suicidality) using independently written items, wording, response structure, and scoring bands. Not a reproduction of, and not scored equivalently to, any copyrighted instrument.",
}

# ---------------------------------------------------------------------------
# 5) Anxiety Pattern Inventory (API-10) — original, Beck-Anxiety-domain-equivalent
# ---------------------------------------------------------------------------
API = {
    "template_key": "api10",
    "legacy_template_id": None,
    "name": "Anxiety Pattern Inventory (API-10)",
    "description": "Original 10-item structured measure of somatic and cognitive anxiety severity, independently authored for this platform.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Please rate how much each symptom has bothered you over the past week.",
        "questions": [
            {"id": 1, "text": "I notice my heart racing or pounding without a clear physical reason.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 2, "text": "I feel shaky or trembly.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 3, "text": "I feel unsteady or like I might lose my balance.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 4, "text": "I have trouble catching my breath or feel like I can't get enough air.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 5, "text": "I sweat or feel hot flashes even when I'm not physically exerting myself.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 6, "text": "I feel a sense of dread, like something bad is about to happen.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 7, "text": "I feel keyed up, tense, or unable to relax.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 8, "text": "I worry I am losing control or \"going crazy.\"", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 9, "text": "I feel a knot in my stomach or nausea related to worry.", "type": "single_choice", "options": ORIGINAL_0_3},
            {"id": 10, "text": "I feel a strong urge to escape or avoid a situation because of how anxious it makes me.", "type": "single_choice", "options": ORIGINAL_0_3},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 30},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 7, "label": "Minimal"},
            {"min": 8, "max": 15, "label": "Mild"},
            {"min": 16, "max": 22, "label": "Moderate"},
            {"min": 23, "max": 30, "label": "Severe"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "api10_severe_somatic",
                "condition": "total_score >= 23",
                "risk_level": "MEDIUM",
                "flag": "SEVERE_SOMATIC_ANXIETY",
                "message": "Severe somatic anxiety symptoms reported — consider medical rule-out (e.g., cardiac, thyroid) alongside psychological assessment.",
            }
        ]
    },
    "notes": "Original 10-item instrument authored for this platform, covering the same somatic/cognitive anxiety domain as commercial anxiety inventories using independently written items and scoring bands. Not a reproduction of any copyrighted instrument.",
}

# ---------------------------------------------------------------------------
# 6) Clinician-Rated Depression Severity Scale (CDSS-14) — original, Hamilton-domain-equivalent
# ---------------------------------------------------------------------------
CDSS = {
    "template_key": "cdss14",
    "legacy_template_id": None,
    "name": "Clinician-Rated Depression Severity Scale (CDSS-14)",
    "description": "Original 14-domain clinician-administered depression severity scale, independently authored for this platform.",
    "template_type": "CLINICIAN_RATED",
    "license_status": "FREE",
    "delivery": "CLINICIAN_RATED",
    "definition_json": {
        "instructions": "To be completed by the treating clinician based on a structured or semi-structured interview with the patient. Not intended for direct patient self-report.",
        "questions": [
            {"id": 1, "text": "Depressed mood (sadness, hopelessness, helplessness, worthlessness)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 2, "text": "Guilt / self-reproach", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 3, "text": "Suicidal ideation or intent", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 4, "text": "Difficulty falling asleep (early insomnia)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 5, "text": "Difficulty staying asleep (middle insomnia)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 6, "text": "Early morning waking (late insomnia)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 7, "text": "Reduced interest or engagement in work or usual activities", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 8, "text": "Psychomotor retardation (slowed speech, movement, thinking)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 9, "text": "Psychomotor agitation (restlessness, fidgeting)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 10, "text": "Psychological anxiety (subjective tension, worry, irritability)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 11, "text": "Somatic symptoms (GI complaints, fatigue, aches, appetite or weight changes)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 12, "text": "Loss of insight into the nature or severity of the condition", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 13, "text": "Diurnal variation (symptoms notably worse at a particular time of day)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 14, "text": "Depersonalization or derealization", "type": "single_choice", "options": CLINICIAN_0_4},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 56},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 7, "label": "No clinically significant depression"},
            {"min": 8, "max": 16, "label": "Mild"},
            {"min": 17, "max": 26, "label": "Moderate"},
            {"min": 27, "max": 56, "label": "Severe"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "cdss14_item3_suicide_flag",
                "condition": "question_3 >= 2",
                "risk_level": "HIGH",
                "flag": "SUICIDE_RISK",
                "message": "Clinician-rated suicidal ideation/intent at moderate severity or higher. Conduct a full suicide risk assessment immediately.",
            }
        ]
    },
    "notes": "Original clinician-administered severity scale, independently authored. Covers the same general symptom domains as established clinician-rated depression scales but is not a reproduction of any copyrighted instrument's item text, item weighting, or scoring algorithm.",
}

# ---------------------------------------------------------------------------
# 7) Clinician-Rated Anxiety Severity Scale (CASS-13) — original, Hamilton-domain-equivalent
# ---------------------------------------------------------------------------
CASS = {
    "template_key": "cass13",
    "legacy_template_id": None,
    "name": "Clinician-Rated Anxiety Severity Scale (CASS-13)",
    "description": "Original 13-domain clinician-administered anxiety severity scale, independently authored for this platform.",
    "template_type": "CLINICIAN_RATED",
    "license_status": "FREE",
    "delivery": "CLINICIAN_RATED",
    "definition_json": {
        "instructions": "To be completed by the treating clinician based on a structured or semi-structured interview with the patient. Not intended for direct patient self-report.",
        "questions": [
            {"id": 1, "text": "Anxious mood (worry, apprehension, irritability)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 2, "text": "Tension (subjective tension, startling easily, trembling, restlessness)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 3, "text": "Fears (of crowds, being alone, animals, travel, etc.)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 4, "text": "Sleep disturbance related to anxiety or worry", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 5, "text": "Cognitive difficulties (poor concentration, memory complaints related to anxiety)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 6, "text": "Low mood accompanying the anxiety", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 7, "text": "Muscular tension (aches, stiffness, restlessness)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 8, "text": "Sensory symptoms (ringing in ears, blurred vision, tingling)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 9, "text": "Cardiovascular symptoms (palpitations, chest discomfort)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 10, "text": "Respiratory symptoms (chest tightness, breathlessness)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 11, "text": "Gastrointestinal symptoms (nausea, stomach discomfort, indigestion)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 12, "text": "Autonomic symptoms (dry mouth, sweating, dizziness)", "type": "single_choice", "options": CLINICIAN_0_4},
            {"id": 13, "text": "Observable behavior during the interview (fidgeting, restlessness, tremor, sweating, facial or postural tension)", "type": "single_choice", "options": CLINICIAN_0_4},
        ],
    },
    "scoring_rules": {"type": "sum", "min": 0, "max": 52},
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 7, "label": "No clinically significant anxiety"},
            {"min": 8, "max": 14, "label": "Mild"},
            {"min": 15, "max": 23, "label": "Moderate"},
            {"min": 24, "max": 52, "label": "Severe"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "cass13_severe",
                "condition": "total_score >= 24",
                "risk_level": "MEDIUM",
                "flag": "SEVERE_ANXIETY_CLINICIAN_RATED",
                "message": "Clinician-rated anxiety in the severe range — consider prioritizing follow-up and reviewing for comorbid conditions.",
            }
        ]
    },
    "notes": "Original clinician-administered severity scale, independently authored. Covers the same general symptom domains as established clinician-rated anxiety scales but is not a reproduction of any copyrighted instrument's item text, item weighting, or scoring algorithm.",
}

# ---------------------------------------------------------------------------
# 8) Copenhagen Burnout Inventory (CBI) — real instrument, released free of charge
# ---------------------------------------------------------------------------
CBI = {
    "template_key": "cbi",
    "legacy_template_id": None,
    "name": "Copenhagen Burnout Inventory (CBI)",
    "description": "Validated burnout measure covering personal, work-related, and client-related burnout. Developed by Denmark's National Institute of Occupational Health and released for free use as an open alternative to commercially-restricted burnout inventories.",
    "template_type": "SCREENING",
    "license_status": "FREE",
    "delivery": "IN_APP",
    "definition_json": {
        "instructions": "Please answer each question based on how you have generally felt recently. Intended primarily for clinician/staff self-assessment of burnout, not for assignment to patients.",
        "questions": [
            {"id": 1, "subscale": "personal_burnout", "text": "How often do you feel tired?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 2, "subscale": "personal_burnout", "text": "How often are you physically exhausted?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 3, "subscale": "personal_burnout", "text": "How often are you emotionally exhausted?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 4, "subscale": "personal_burnout", "text": "How often do you think, \"I can't take it anymore\"?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 5, "subscale": "personal_burnout", "text": "How often do you feel worn out?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 6, "subscale": "personal_burnout", "text": "How often do you feel weak and susceptible to illness?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 7, "subscale": "work_related_burnout", "text": "Do you feel worn out at the end of the working day?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 8, "subscale": "work_related_burnout", "text": "Are you exhausted in the morning at the thought of another day at work?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 9, "subscale": "work_related_burnout", "text": "Do you feel that every working hour is tiring for you?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 10, "subscale": "work_related_burnout", "text": "Do you have enough energy for family and friends during leisure time?", "type": "single_choice", "options": CBI_SCALE, "reverse_scored": True},
            {"id": 11, "subscale": "work_related_burnout", "text": "Is your work emotionally exhausting?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 12, "subscale": "work_related_burnout", "text": "Does your work frustrate you?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 13, "subscale": "work_related_burnout", "text": "Do you feel burnt out because of your work?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 14, "subscale": "client_related_burnout", "text": "Do you find it hard to work with patients?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 15, "subscale": "client_related_burnout", "text": "Do you find it frustrating to work with patients?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 16, "subscale": "client_related_burnout", "text": "Does it drain your energy to work with patients?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 17, "subscale": "client_related_burnout", "text": "Do you feel that you give more than you get back when you work with patients?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 18, "subscale": "client_related_burnout", "text": "Are you tired of working with patients?", "type": "single_choice", "options": CBI_SCALE},
            {"id": 19, "subscale": "client_related_burnout", "text": "Do you sometimes wonder how long you will be able to continue working with patients?", "type": "single_choice", "options": CBI_SCALE},
        ],
        "subscales": {
            "personal_burnout": [1, 2, 3, 4, 5, 6],
            "work_related_burnout": [7, 8, 9, 10, 11, 12, 13],
            "client_related_burnout": [14, 15, 16, 17, 18, 19],
        },
    },
    "scoring_rules": {
        "type": "subscale_average",
        "reverse_items": [10],
        "reverse_formula": "100 - value",
        "subscales": {
            "personal_burnout": {"items": [1, 2, 3, 4, 5, 6]},
            "work_related_burnout": {"items": [7, 8, 9, 10, 11, 12, 13]},
            "client_related_burnout": {"items": [14, 15, 16, 17, 18, 19]},
        },
        "min": 0,
        "max": 100,
    },
    "interpretation_rules": {
        "bands": [
            {"min": 0, "max": 49, "label": "Low burnout"},
            {"min": 50, "max": 74, "label": "Moderate burnout"},
            {"min": 75, "max": 100, "label": "High burnout"},
        ]
    },
    "risk_rules": {
        "rules": [
            {
                "id": "cbi_high_burnout",
                "condition": "any_subscale_average >= 75",
                "risk_level": "MEDIUM",
                "flag": "HIGH_BURNOUT",
                "message": "One or more burnout subscales in the high range (>=75). Consider workload review and support resources.",
            }
        ]
    },
    "notes": "Real, validated instrument (Kristensen et al., 2005), released by the Danish National Institute of Occupational Health for free use as an open alternative to the commercially-restricted Maslach Burnout Inventory. Same clinical construct (personal / work-related / client-related burnout), no license required. Best suited for clinician/staff self-assessment rather than patient assignment — consider surfacing under a staff-wellbeing area of the product rather than the patient assessment flow.",
}

PHASE2_ASSESSMENTS = [AUDIT, PCL5, SDI, MPI, API, CDSS, CASS, CBI]


async def seed(conn: asyncpg.Connection, org_id: str, admin_id: str) -> None:
    for a in PHASE2_ASSESSMENTS:
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
