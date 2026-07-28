"""
safety.py — crisis screening for the patient companion
-------------------------------------------------------
A deterministic screen that runs on EVERY patient message, independently of
the language model. The model is asked to flag risk too, but a model that
misses something must not be the only thing standing between a patient in
crisis and their clinician, so this runs first and cannot be talked out of it
by anything in the conversation.

It is intentionally over-sensitive. A false positive costs a patient one
supportive message pointing them at real help and a flag their clinician can
dismiss. A false negative costs considerably more.

This is a screen, not an assessment. It does not score, diagnose, or decide
anything clinical; it decides whether a human needs to be told.
"""

from __future__ import annotations

import re

# Explicit intent or plan. These warrant immediate escalation.
_CRISIS = [
    r"\bkill(ing)?\s+my\s?self\b",
    r"\bkill\s+me\b",
    r"\bend(ing)?\s+(my|it)\s+(life|all)\b",
    r"\btake\s+my\s+(own\s+)?life\b",
    r"\bcommit\s+suicide\b",
    r"\bsuicid(e|al)\b",
    r"\bwant\s+to\s+die\b",
    # Allow words in between: "better off if I was dead", "better off
    # without me". A rigid phrase match missed exactly this in testing.
    r"\bbetter\s+off\s+(\w+\s+){0,4}dead\b",
    r"\bbetter\s+off\s+without\s+me\b",
    r"\b(everyone|everybody|they|world)\s+.{0,30}\bwithout\s+me\b",
    r"\bwish\s+(i\s+)?(was|were)\s+dead\b",
    r"\bwant\s+(it\s+)?(all\s+)?to\s+(end|stop)\b",
    r"\bstop\s+(existing|being\s+here)\b",
    r"\bdon'?t\s+want\s+to\s+(be\s+here|live|wake\s+up)\b",
    r"\bno\s+reason\s+to\s+live\b",
    r"\bhurt(ing)?\s+my\s?self\b",
    r"\bharm(ing)?\s+my\s?self\b",
    r"\bself[-\s]?harm\b",
    r"\bcut(ting)?\s+my\s?self\b",
    r"\boverdose\b",
    r"\bhurt\s+(someone|somebody|him|her|them)\b",
    # Arabic — the practice is Arabic-speaking, and a screen that only reads
    # English would miss the patients most likely to write in their own language.
    r"انتحار",
    r"أقتل نفسي",
    r"اقتل نفسي",
    r"أؤذي نفسي",
    r"اؤذي نفسي",
    r"لا أريد أن أعيش",
    r"مش عايز أعيش",
]

# Distress worth a clinician's attention, but not an emergency.
_ELEVATED = [
    r"\bhopeless\b",
    r"\bworthless\b",
    r"\bcan'?t\s+(go\s+on|cope|take\s+(it|this)\s+anymore)\b",
    r"\bgive\s+up\b",
    r"\bnothing\s+matters\b",
    r"\btrapped\b",
    r"\bburden\s+to\b",
    r"يأس",
    r"ما عادش قادر",
]

_CRISIS_RE = [re.compile(p, re.IGNORECASE) for p in _CRISIS]
_ELEVATED_RE = [re.compile(p, re.IGNORECASE) for p in _ELEVATED]

CRISIS = "crisis"
ELEVATED = "elevated"
NONE = "none"


def screen(message: str) -> str:
    """Return CRISIS, ELEVATED or NONE for one patient message."""
    if not message:
        return NONE
    text = message.strip()
    for rx in _CRISIS_RE:
        if rx.search(text):
            return CRISIS
    for rx in _ELEVATED_RE:
        if rx.search(text):
            return ELEVATED
    return NONE
