-- patients.last_seen is read/written throughout the modular backend
-- (patient_repository_db_real.py, session_repository_db_real.py,
-- schemas/patients.py) but was never added to the schema. Pre-existing
-- bug, unrelated to access_control wiring — found while regression-testing
-- GET /patients, which has been 500ing since this code was first deployed.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
