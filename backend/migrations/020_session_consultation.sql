-- Session consultation — the clinician actually sitting with the patient.
--
-- A session IS an appointment: it happens at a time, for a duration. The
-- `sessions` table already carries `scheduled_at`, `duration_minutes` and
-- `appointment_id` (the booking it belongs to), but nothing recorded when the
-- consultation really started or ended, and nothing linked a session forward
-- to the follow-up booked at the end of it.
--
-- Three columns, all additive and nullable, so every existing row stays valid:
--
--   started_at           when the clinician opened the session. `scheduled_at`
--                        is when it was meant to happen; these differ whenever
--                        a session starts early or late, and only the second
--                        one can be used to measure real elapsed time.
--   ended_at             when the clinician completed it. Together with
--                        started_at this is the evidence behind the elapsed
--                        `duration_minutes` written at completion.
--   next_appointment_id  the follow-up booked at the end of THIS session.
--                        `appointment_id` already points backwards at the
--                        booking the session was held under; this points
--                        forwards, so the chain of care is navigable in both
--                        directions without a scan over appointments.
--
-- Nothing is backfilled: a historical session has no honest start/end time,
-- and inventing one from scheduled_at would be a fabricated clinical record.
-- Null means "not recorded", which is the truth.

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- ON DELETE SET NULL: deleting a future appointment must not delete the
-- historical session that pointed at it.
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS next_appointment_id UUID
        REFERENCES appointments (id) ON DELETE SET NULL;

-- "Which session booked this appointment?" — the reverse lookup used when
-- opening a follow-up from the scheduler.
CREATE INDEX IF NOT EXISTS idx_sessions_next_appointment
    ON sessions (next_appointment_id);
