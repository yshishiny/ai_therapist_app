import uuid
from datetime import date, datetime
from typing import Any

# Every appointment listing selects the same shape. Kept in one place so the
# Scheduler grid, the "current appointment" lookup, create and update can never
# drift apart and hand the API different field sets.
#
# COALESCE(p.name, p.full_name): patients.name is nullable, full_name is NOT NULL
# (backend/schema.sql), so a patient with no short name still gets a label
# instead of a blank cell.
_APPOINTMENT_COLUMNS = """
    a.id, a.patient_id,
    COALESCE(p.name, p.full_name) AS patient_name,
    p.risk AS patient_risk,
    a.therapist_id, a.appointment_type, a.title,
    a.start_time, a.end_time, a.location, a.status, a.meeting_link
"""

# Tenant scoping. `appointments.org_id` is the real tenant column as of
# migration_appointments_scheduler.sql; the second arm is the safety net for any
# row the backfill could not reach (patient deleted, or the migration not yet
# applied), which keeps every previously-visible row visible.
#
# A row with a null org_id AND no patient has no derivable tenant and is
# deliberately excluded — it must not leak across organisations.
_ORG_SCOPE = "(a.org_id = $1 OR (a.org_id IS NULL AND p.org_id = $1))"

# LEFT JOIN, not INNER JOIN: a documentation/admin block has no patient, and an
# INNER JOIN would silently drop it from every listing.
_FROM_CLAUSE = """
    FROM appointments a
    LEFT JOIN patients p ON p.id = a.patient_id
"""


class AppointmentRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_appointments(self, org_id: str) -> list[dict]:
        """Every appointment in the org, all time, ordered by start_time.

        Unchanged behaviour — this is what GET /appointments returns when no
        query parameters are supplied, and the mobile calendar depends on it.
        """
        if self.db is None:
            return []
        rows = await self.db.fetch(
            f"""SELECT {_APPOINTMENT_COLUMNS}
                {_FROM_CLAUSE}
                WHERE {_ORG_SCOPE}
                ORDER BY a.start_time ASC""",
            uuid.UUID(org_id),
        )
        return [self._row_to_dict(r) for r in rows]

    async def list_appointments_range(
        self,
        org_id: str,
        date_from: date | None = None,
        date_to: date | None = None,
        therapist_id: str | None = None,
    ) -> list[dict]:
        """Appointments filtered by inclusive calendar date range and/or clinician.

        `date_from` / `date_to` are calendar dates, both inclusive: `date_to`
        expands to the end of that day. Either bound may be omitted for an
        open-ended range. `therapist_id` scopes to one clinician's calendar.
        """
        if self.db is None:
            return []

        params: list[Any] = [uuid.UUID(org_id)]
        predicates = [_ORG_SCOPE]

        if date_from is not None:
            params.append(date_from)
            predicates.append(f"a.start_time >= ${len(params)}::date")

        if date_to is not None:
            params.append(date_to)
            # Inclusive end: everything strictly before the following midnight.
            predicates.append(f"a.start_time < (${len(params)}::date + INTERVAL '1 day')")

        if therapist_id is not None:
            params.append(therapist_id)
            predicates.append(f"a.therapist_id = ${len(params)}")

        rows = await self.db.fetch(
            f"""SELECT {_APPOINTMENT_COLUMNS}
                {_FROM_CLAUSE}
                WHERE {' AND '.join(predicates)}
                ORDER BY a.start_time ASC""",
            *params,
        )
        return [self._row_to_dict(r) for r in rows]

    @staticmethod
    def _row_to_dict(row: Any) -> dict:
        """Map an asyncpg Record to a plain dict, stringifying every UUID.

        Deliberately generic. asyncpg returns uuid.UUID for UUID columns and
        every one of them lands in a `str`-typed Pydantic field; returning the
        raw UUID has produced a 500 in this codebase repeatedly. Casting by
        type rather than by an explicit key list means a column added later
        cannot reintroduce the bug.
        """
        d = dict(row)
        for key, value in d.items():
            if isinstance(value, uuid.UUID):
                d[key] = str(value)
        return d

    async def get_current_appointment(self, org_id: str, therapist_id: str) -> dict | None:
        """The clinician's ongoing (or about-to-start) appointment, if any.

        Widened by 15 minutes on each side of the booked window so a
        clinician opening "New session" slightly early or running a
        little over still gets matched to the right patient.
        """
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            f"""SELECT {_APPOINTMENT_COLUMNS}
                {_FROM_CLAUSE}
                WHERE {_ORG_SCOPE}
                  AND a.therapist_id = $2
                  AND a.status NOT IN ('CANCELLED', 'COMPLETED', 'NO_SHOW')
                  AND NOW() BETWEEN a.start_time - INTERVAL '15 minutes'
                                 AND a.end_time + INTERVAL '15 minutes'
                ORDER BY a.start_time ASC
                LIMIT 1""",
            uuid.UUID(org_id),
            therapist_id,
        )
        return self._row_to_dict(row) if row else None

    async def patient_exists(self, patient_id: str, org_id: str) -> bool:
        """Check if a patient exists in the organisation."""
        if self.db is None:
            return False
        result = await self.db.fetchval(
            "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return result is not None

    async def create_appointment(
        self,
        patient_id: str,
        therapist_id: str,
        start_time: datetime,
        end_time: datetime,
        location: str | None,
        meeting_link: str | None,
        org_id: str | None = None,
        appointment_type: str | None = None,
        title: str | None = None,
    ) -> dict:
        """Create a new appointment.

        org_id is written directly onto the row so new appointments carry their
        own tenant rather than inheriting it through the patient join.
        """
        row = await self.db.fetchrow(
            f"""WITH ins AS (
                    INSERT INTO appointments
                        (id, patient_id, therapist_id, org_id, start_time, end_time,
                         location, meeting_link, appointment_type, title, status)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
                            COALESCE($8, 'FOLLOW_UP'), $9, 'SCHEDULED')
                    RETURNING *
                )
                SELECT {_APPOINTMENT_COLUMNS}
                FROM ins a
                LEFT JOIN patients p ON p.id = a.patient_id""",
            uuid.UUID(patient_id) if patient_id else None,
            therapist_id,
            uuid.UUID(org_id) if org_id else None,
            start_time,
            end_time,
            location,
            meeting_link,
            appointment_type,
            title,
        )
        return self._row_to_dict(row)

    async def update_appointment_status(
        self,
        appointment_id: str,
        org_id: str,
        new_status: str,
    ) -> dict | None:
        """Update appointment status, returns None if not found.

        Scoped on a.org_id with the same patients fallback as the listings, so a
        non-patient block is reachable and a pre-migration row is not orphaned.
        """
        row = await self.db.fetchrow(
            f"""WITH upd AS (
                    UPDATE appointments a SET status=$1
                    WHERE a.id=$2
                      AND (a.org_id = $3
                           OR (a.org_id IS NULL AND EXISTS (
                                   SELECT 1 FROM patients p
                                   WHERE p.id = a.patient_id AND p.org_id = $3)))
                    RETURNING a.*
                )
                SELECT {_APPOINTMENT_COLUMNS}
                FROM upd a
                LEFT JOIN patients p ON p.id = a.patient_id""",
            new_status,
            uuid.UUID(appointment_id),
            uuid.UUID(org_id),
        )
        return self._row_to_dict(row) if row else None
