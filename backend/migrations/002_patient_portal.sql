-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Patient Portal — new tables & columns
-- Run after schema.sql. Idempotent (uses IF NOT EXISTS + DO NOTHING).
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Patient User Accounts (login credentials for patients) ───────────────
-- Separate from `clinicians` so role/permissions can diverge cleanly.

CREATE TABLE IF NOT EXISTS patient_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_patient_users_patient
    ON patient_users (patient_id);


-- ─── 2. Mood Logs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mood_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    org_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    mood_score   INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
    energy_score INTEGER NOT NULL CHECK (energy_score BETWEEN 1 AND 5),
    note         TEXT,
    emotions     JSONB NOT NULL DEFAULT '[]',
    logged_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mood_patient_time
    ON mood_logs (patient_id, logged_at DESC);


-- ─── 3. AI Companion Conversations ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
    id             UUID NOT NULL,              -- conversation thread id (multiple rows share same id)
    patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    org_id         UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role           TEXT NOT NULL,               -- 'user' | 'assistant'
    content        TEXT NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_conv_patient
    ON ai_conversations (patient_id, created_at DESC);


-- ─── 4. Sessions view (maps to appointments for /me/sessions) ────────────────
-- The patient portal backend expects a `sessions` table.
-- We create it as a simple companion to appointments with patient-facing fields.

CREATE TABLE IF NOT EXISTS sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    org_id            UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    appointment_id    UUID REFERENCES appointments(id),
    session_type      TEXT DEFAULT 'Individual',       -- Individual, Group, Family
    scheduled_at      TIMESTAMP WITH TIME ZONE,
    duration_minutes  INTEGER DEFAULT 50,
    status            TEXT DEFAULT 'scheduled',         -- scheduled, completed, cancelled
    summary_snippet   TEXT,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_patient
    ON sessions (patient_id, scheduled_at DESC);


-- ─── 5. Extend homework_tasks for patient portal ────────────────────────────
-- Add columns the /me/homework routes expect. All nullable / defaulted so
-- existing rows aren't broken.

ALTER TABLE homework_tasks
    ADD COLUMN IF NOT EXISTS org_id        UUID REFERENCES organisations(id),
    ADD COLUMN IF NOT EXISTS description   TEXT,
    ADD COLUMN IF NOT EXISTS task_type     TEXT DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS assigned_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS completed_at  TIMESTAMP WITH TIME ZONE;


-- ─── 6. Extend assessment_results for org scoping ───────────────────────────

ALTER TABLE assessment_results
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id);


-- ─── 7. Extend assessment_instances for org scoping ─────────────────────────

ALTER TABLE assessment_instances
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id);


-- ─── 8. Add patient login endpoint to the backend auth flow ─────────────────
-- Seed a demo patient + patient_user so you can test immediately.
-- Password is 'welcome123' (bcrypt hash below).

DO $$
DECLARE
    v_org_id  UUID;
    v_patient UUID;
BEGIN
    -- Pick the first organisation (or create a default one)
    SELECT id INTO v_org_id FROM organisations LIMIT 1;
    IF v_org_id IS NULL THEN
        INSERT INTO organisations (name) VALUES ('Default Clinic')
        RETURNING id INTO v_org_id;
    END IF;

    -- Check if demo patient already exists
    SELECT id INTO v_patient FROM patients WHERE email = 'patient@demo.com' LIMIT 1;
    IF v_patient IS NULL THEN
        INSERT INTO patients (org_id, therapist_id, full_name, name, gender, status, risk, diagnosis, email)
        VALUES (v_org_id, 'system', 'Amira Hassan', 'Amira', 'Female', 'Active', 'Low', 'Generalised Anxiety', 'patient@demo.com')
        RETURNING id INTO v_patient;
    END IF;

    -- Create patient user account (password: welcome123)
    INSERT INTO patient_users (org_id, patient_id, email, password_hash)
    VALUES (
        v_org_id,
        v_patient,
        'patient@demo.com',
        '$2b$12$LJ3m9X5US5bG9VDz1IqNZeQXpvm8VL7jFHSiPyVXCmkMCLXE/WKGK'
    ) ON CONFLICT (email) DO NOTHING;

    -- Seed some homework for this patient so the UI isn't empty
    INSERT INTO homework_tasks (patient_id, org_id, title, description, task_type, status, due_date)
    VALUES
        (v_patient, v_org_id, 'Emotion Journal', 'Write 3 emotions you felt today and what triggered each one.', 'journaling', 'ASSIGNED', CURRENT_DATE + INTERVAL '2 days'),
        (v_patient, v_org_id, 'Box Breathing', '4-4-4-4 breathing exercise for 5 minutes before bed.', 'breathing', 'ASSIGNED', CURRENT_DATE + INTERVAL '1 day'),
        (v_patient, v_org_id, 'Read Chapter 3', 'Read chapter 3 of "The Body Keeps the Score".', 'reading', 'ASSIGNED', CURRENT_DATE + INTERVAL '5 days')
    ON CONFLICT DO NOTHING;

    -- Seed a sample session for this patient
    INSERT INTO sessions (patient_id, org_id, session_type, scheduled_at, duration_minutes, status)
    VALUES
        (v_patient, v_org_id, 'Individual', NOW() + INTERVAL '3 days', 50, 'scheduled'),
        (v_patient, v_org_id, 'Individual', NOW() - INTERVAL '7 days', 50, 'completed')
    ON CONFLICT DO NOTHING;
END $$;
