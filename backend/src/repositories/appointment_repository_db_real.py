import uuid
from datetime import datetime
from typing import Any


class AppointmentRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_appointments(self, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT a.id, a.patient_id, a.start_time, a.end_time,
                      a.location, a.status, a.meeting_link
               FROM appointments a
               JOIN patients p ON p.id = a.patient_id
               WHERE p.org_id = $1
               ORDER BY a.start_time ASC""",
            uuid.UUID(org_id),
        )
        return [self._row_to_dict(r) for r in rows]

    @staticmethod
    def _row_to_dict(row: Any) -> dict:
        d = dict(row)
        d['id'] = str(d['id'])
        d['patient_id'] = str(d['patient_id'])
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
            """SELECT a.id, a.patient_id, a.start_time, a.end_time,
                      a.location, a.status, a.meeting_link
               FROM appointments a
               JOIN patients p ON p.id = a.patient_id
               WHERE p.org_id = $1
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
    ) -> dict:
        """Create a new appointment."""
        row = await self.db.fetchrow(
            """INSERT INTO appointments
                   (id, patient_id, therapist_id, start_time, end_time,
                    location, meeting_link, status)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'SCHEDULED')
               RETURNING id, patient_id, start_time, end_time, location, status, meeting_link""",
            uuid.UUID(patient_id),
            therapist_id,
            start_time,
            end_time,
            location,
            meeting_link,
        )
        return self._row_to_dict(row)

    async def update_appointment_status(
        self,
        appointment_id: str,
        org_id: str,
        new_status: str,
    ) -> dict | None:
        """Update appointment status, returns None if not found."""
        row = await self.db.fetchrow(
            """UPDATE appointments a SET status=$1
               FROM patients p
               WHERE a.id=$2 AND a.patient_id=p.id AND p.org_id=$3
               RETURNING a.id, a.patient_id, a.start_time, a.end_time,
                         a.location, a.status, a.meeting_link""",
            new_status,
            uuid.UUID(appointment_id),
            uuid.UUID(org_id),
        )
        return self._row_to_dict(row) if row else None
