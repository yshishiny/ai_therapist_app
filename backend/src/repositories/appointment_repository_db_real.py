import uuid
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
        return [dict(r) for r in rows]
