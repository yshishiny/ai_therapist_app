import uuid
from typing import Any


class ClinicianRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_clinicians(self, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT c.id, c.email, c.full_name, c.role, c.active,
                      COUNT(p.id) AS patient_count
               FROM clinicians c
               LEFT JOIN patients p
                 ON p.therapist_id = c.id::text AND p.org_id = c.org_id
               WHERE c.org_id = $1
               GROUP BY c.id, c.email, c.full_name, c.role, c.active
               ORDER BY c.full_name NULLS LAST, c.email""",
            uuid.UUID(org_id),
        )
        return [self._row_to_dict(r) for r in rows]

    async def clinician_exists(self, clinician_id: str, org_id: str) -> bool:
        if self.db is None:
            return False
        try:
            clinician_uuid = uuid.UUID(clinician_id)
        except ValueError:
            return False
        result = await self.db.fetchval(
            "SELECT 1 FROM clinicians WHERE id = $1 AND org_id = $2",
            clinician_uuid,
            uuid.UUID(org_id),
        )
        return result is not None

    @staticmethod
    def _row_to_dict(row: Any) -> dict:
        data = dict(row)
        data["id"] = str(data["id"])
        data["full_name"] = data.get("full_name") or data["email"]
        return data
