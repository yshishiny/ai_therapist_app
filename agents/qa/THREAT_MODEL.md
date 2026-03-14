# QA & Security - Threat Model

## Assets to Protect

1. **PHI (Protected Health Information)**: Patients' names, notes, and scores.
2. **Access Credentials**: Therapist and Admin login tokens.
3. **AI Integrity**: System prompts and safety guardrails.

## Threats

- **Data Breach**: Unauthorized access to Firestore database.
- **Prompt Injection**: Manipulation of AI to provide unsafe medical advice.
- **Insider Threat**: Unauthorized access by administrative staff to clinical notes.

## Mitigations

- Row-level security (Firestore Security Rules).
- Audit logging for all access to PHI.
- Regular red-team testing of AI prompts.
