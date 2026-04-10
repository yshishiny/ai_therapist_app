# SCID-II (Arabic DSM-IV) Training Pack

This pack contains:
- The original **empty questionnaire** PDF.
- Multiple **fictional filled response sets** (CSV + DOCX).
- For each patient: a **therapist-facing screening report** (Markdown) and **JSON output** suitable for AI-agent training.

## Important
- This is **screening** output only. The agent must not diagnose.
- Any endorsement of self-harm (items 97–98) or severe violence/weapon/sexual coercion items must trigger **safety escalation**.

## Scoring logic (used here)
The questionnaire items are grouped in-order by domain (per the questionnaire layout):
- Avoidant: 1–7 (threshold 4)
- Dependent: 8–15 (threshold 5)
- Obsessive-Compulsive: 16–24 (threshold 4)
- Passive-Aggressive: 25–32 (threshold 4)
- Depressive: 33–40 (threshold 5)
- Paranoid: 41–48 (threshold 4)
- Schizotypal: 49–57 (threshold 5)
- Schizoid: 58–65 (threshold 4)
- Histrionic: 66–72 (threshold 5)
- Narcissistic: 73–89 (threshold 5)
- Borderline: 90–104 (threshold 5)
- Antisocial: 105–119 (threshold 3)

## Agent output contract (recommended)
1) Domain scores + screen-positive flags
2) Risk flags section (always)
3) Non-diagnostic formulation language ("may be consistent with traits...")
4) Next-step clinician interview prompts
5) Safety escalation text if risk items are endorsed

## JSON schema used in this pack
See `Agent_Output_Schema.json`.
