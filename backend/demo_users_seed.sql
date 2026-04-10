-- Demo user seed for AI Therapist
-- Run this once against the target PostgreSQL database (e.g. Railway Postgres).
--
-- Notes:
-- 1) The current backend authenticates ONLY against the clinicians table.
-- 2) There is no patient login model yet.
-- 3) To preserve your requested test credentials, patient@demo.com is seeded
--    as a clinician-role demo account for now.

BEGIN;

INSERT INTO organisations (name)
VALUES ('Clinic Demo')
ON CONFLICT (name) DO NOTHING;

INSERT INTO clinicians (org_id, email, password_hash, role, active)
SELECT
  id,
  'admin@clinic.com',
  '$2b$12$OUEwrm9rcvuURqSk5y9gxeLarR/Kshz4ur7oobVwwViY6G1hfE1Hq',
  'admin',
  TRUE
FROM organisations
WHERE name = 'Clinic Demo'
ON CONFLICT (email) DO NOTHING;

INSERT INTO clinicians (org_id, email, password_hash, role, active)
SELECT
  id,
  'patient@demo.com',
  '$2b$12$4l7V2VrRZp2.1U9hVInbs.4LYP0e7YzSOE58cQK3eM0jyVG9J9Lq2',
  'clinician',
  TRUE
FROM organisations
WHERE name = 'Clinic Demo'
ON CONFLICT (email) DO NOTHING;

COMMIT;
