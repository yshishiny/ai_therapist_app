import json
import uuid
from datetime import date, datetime, timezone
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

    async def create_homework(
        self,
        patient_id: str,
        org_id: str,
        title: str,
        instructions: str | None,
        due_date: date | None,
    ) -> dict:
        """Create a new homework task."""
        now = datetime.now(timezone.utc)
        row = await self.db.fetchrow(
            """INSERT INTO homework_tasks
                   (id, patient_id, org_id, title, description, instructions, due_date, status, assigned_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'ASSIGNED', $7)
               RETURNING id, patient_id, careplan_phase_id, title, description, instructions,
                         task_type, due_date::text AS due_date, status, patient_feedback,
                         therapist_notes, assigned_at, completed_at""",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
            title,
            instructions,
            instructions,
            due_date,
            now,
        )
        return dict(row)

    async def submit_feedback(
        self,
        task_id: str,
        org_id: str,
        feedback: dict,
        new_status: str,
    ) -> bool:
        """Submit feedback for a homework task, returns True if found and updated."""
        result = await self.db.execute(
            """UPDATE homework_tasks ht
               SET patient_feedback=$1, status=$2
               FROM patients p
               WHERE ht.id = $3 AND ht.patient_id = p.id AND p.org_id = $4""",
            json.dumps(feedback),
            new_status,
            uuid.UUID(task_id),
            uuid.UUID(org_id),
        )
        return result != "UPDATE 0"
