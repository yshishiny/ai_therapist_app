import uuid
from typing import Any


class AiReportingRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def get_patient_summary(self, patient_id: str, org_id: str) -> dict | None:
        """Get patient summary info for report generation."""
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            """SELECT full_name, diagnosis, risk, status
               FROM patients
               WHERE id=$1 AND org_id=$2""",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return dict(row) if row else None

    async def get_recent_sessions(self, patient_id: str, limit: int = 5) -> list[dict]:
        """Get recent session notes for a patient."""
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT template, assessment, plan, created_at
               FROM session_notes
               WHERE patient_id=$1
               ORDER BY created_at DESC
               LIMIT $2""",
            uuid.UUID(patient_id),
            limit,
        )
        return [dict(row) for row in rows]

    async def get_recent_assessments(self, patient_id: str, limit: int = 10) -> list[dict]:
        """Get recent assessment results for a patient."""
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT assessment_id, raw_score, severity, created_at
               FROM assessment_results
               WHERE patient_id=$1
               ORDER BY created_at DESC
               LIMIT $2""",
            uuid.UUID(patient_id),
            limit,
        )
        return [dict(row) for row in rows]

    async def get_recent_homework(self, patient_id: str, limit: int = 10) -> list[dict]:
        """Get recent homework tasks for a patient."""
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT title, status, due_date
               FROM homework_tasks
               WHERE patient_id=$1
               ORDER BY due_date DESC NULLS LAST
               LIMIT $2""",
            uuid.UUID(patient_id),
            limit,
        )
        return [dict(row) for row in rows]
