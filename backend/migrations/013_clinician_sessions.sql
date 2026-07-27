-- Extend the existing `sessions` table (previously patient-portal-only:
-- request/view) with a clinician_id so clinicians can create real sessions
-- directly, and link assessment_instances to the session they were
-- administered in (previously no session concept existed for assessments
-- at all -- context was a free-text label only).

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS clinician_id UUID;
ALTER TABLE assessment_instances ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);
