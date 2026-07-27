-- Scheduler week view — appointments table structural fixes.
--
-- Problem this closes (see design_specs/scheduler.md §8.D):
-- `appointments` has NO org_id column. Tenant scoping was derived entirely by
-- INNER JOINing `patients` and filtering `patients.org_id`. Consequences:
--   (a) a non-patient block (documentation / admin slot) has no tenant at all, and
--   (b) it cannot even be listed, because every query INNER JOINs patients.
--
-- This migration gives appointments its own tenant column, backfills it from the
-- patient it is already attached to, and adds the two columns the Scheduler grid
-- needs to render a cell without string-matching display text.
--
-- Additive and idempotent. No data is dropped or rewritten.
-- NOTE: the organisations table uses the British spelling (backend/schema.sql:4).

-- ─── 1. Tenant column ────────────────────────────────────────────────────────
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations (id);

-- Backfill from the patient every existing row already points at.
-- Rows whose patient has since been deleted (or whose patient_id is null)
-- are left null; the application query falls back to the patients join for
-- those, so nothing disappears from any listing.
UPDATE appointments a
SET org_id = p.org_id
FROM patients p
WHERE p.id = a.patient_id
  AND a.org_id IS NULL
  AND p.org_id IS NOT NULL;

-- ─── 2. Appointment type ─────────────────────────────────────────────────────
-- Vocabulary: INTAKE | FOLLOW_UP | CBT | GROUP | ASSESSMENT | DOCUMENTATION | ADMIN
-- DOCUMENTATION and ADMIN are the "non-patient block" types the Scheduler grid
-- renders in the grey treatment. Classification is driven off this column and
-- off patient_id being null — never off display text.
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(24) DEFAULT 'FOLLOW_UP';

-- If the column already existed from an earlier partial run, make sure no row
-- is left with a null type.
UPDATE appointments
SET appointment_type = 'FOLLOW_UP'
WHERE appointment_type IS NULL;

-- ─── 3. Title for non-patient blocks ─────────────────────────────────────────
-- Patient appointments take their label from patients.name; a block that has no
-- patient (e.g. "Notes block", "Supervision") carries its label here.
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS title TEXT;

-- ─── 4. Allow patient-less rows ──────────────────────────────────────────────
-- schema.sql already declares patient_id without NOT NULL, but deployed
-- databases have carried the constraint. DROP NOT NULL is a no-op when the
-- column is already nullable, so this is safe to run either way.
ALTER TABLE appointments
    ALTER COLUMN patient_id DROP NOT NULL;

-- ─── 5. Indexes ──────────────────────────────────────────────────────────────
-- Tenant scoping now hits a.org_id directly.
CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments (org_id);

-- The Scheduler's actual query shape: org + week window.
CREATE INDEX IF NOT EXISTS idx_appointments_org_time ON appointments (org_id, start_time);

-- "My week": WHERE therapist_id = ? AND start_time BETWEEN ? AND ?
-- (§8.K — the existing indexes are (patient_id) and (start_time) alone.)
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_time ON appointments (therapist_id, start_time);
