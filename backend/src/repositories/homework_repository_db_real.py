import uuid
from typing import Any


class HomeworkRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_homework(self, patient_id: str, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT ht.id, ht.patient_id, ht.title, ht.instructions,
                      ht.due_date::text, ht.status
               FROM homework_tasks ht
               JOIN patients p ON p.id = ht.patient_id
               WHERE ht.patient_id = $1 AND p.org_id = $2
               ORDER BY ht.due_date ASC NULLS LAST""",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return [dict(r) for r in rows]
