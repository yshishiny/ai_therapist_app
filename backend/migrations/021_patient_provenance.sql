-- ============================================================
-- Where each patient record came from
-- ============================================================
-- A clinical record should say how it got there. Until now a seeded
-- demonstration patient and a real person uploaded by their clinician were
-- indistinguishable in the database, which is how ten test records ended up
-- sitting in a working caseload.
--
--   source        BULK_UPLOAD  imported from an intake form
--                 MANUAL       entered one at a time in the app
--                 SEED         created by a seed/demo script, not a real person
--                 SYSTEM       created by the platform (legacy/demo fixtures)
--   created_by    the clinician who added them, where one is known
--   source_detail free text: the file name, the script, the reason
-- ============================================================

ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES clinicians(id),
    ADD COLUMN IF NOT EXISTS source_detail TEXT;

CREATE INDEX IF NOT EXISTS idx_patients_source ON patients (org_id, source);

-- Backfill what is actually known about the existing records, by the cohort
-- each was created in. Stated explicitly rather than guessed at row level.

-- The 14 real patients Dr Heba imported from her intake form.
UPDATE patients
   SET source = 'BULK_UPLOAD',
       created_by = (SELECT id FROM clinicians WHERE lower(email) = 'heba.moustafa5@gmail.com'),
       source_detail = 'Imported from the patient intake form by Dr Heba Moustafa'
 WHERE created_at >= TIMESTAMPTZ '2026-07-28 11:00:00+00'
   AND source = 'MANUAL';

-- The ten patients created by backend/seed_test_patients.py for testing.
UPDATE patients
   SET source = 'SEED',
       source_detail = 'Created by seed_test_patients.py for development and testing'
 WHERE name IN ('Layla Hassan','Ahmed Farouk','Nour El-Sayed','Mostafa Adel','Youssef Kamal',
                'Dina Mansour','Karim Reda','Hana Zaki','Omar Naguib','Sami Younes')
   AND source = 'MANUAL';

-- Legacy demo fixtures that predate any of this.
UPDATE patients
   SET source = 'SYSTEM',
       source_detail = 'Legacy demonstration record'
 WHERE name IN ('Amira','Demo','Session Test Patient')
   AND source = 'MANUAL';
