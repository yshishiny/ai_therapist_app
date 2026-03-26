import json
import uuid
from datetime import datetime
from typing import Any


class PatientPortalRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def update_fcm_token(self, patient_id: str, fcm_token: str) -> None:
        """Update FCM token for push notifications."""
        if self.db is None:
            return
        await self.db.execute(
            "UPDATE patient_users SET fcm_token = $1 WHERE patient_id = $2",
            fcm_token,
            uuid.UUID(patient_id),
        )

    async def get_patient_profile(self, patient_id: str, org_id: str) -> dict | None:
        """Get patient profile by ID."""
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            """SELECT id, full_name, gender, dob,
                      diagnosis AS primary_diagnosis,
                      diagnosis,
                      status,
                      risk AS risk_level,
                      risk,
                      therapist_id
               FROM patients
               WHERE id=$1 AND org_id=$2""",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return dict(row) if row else None

    async def create_mood_log(
        self,
        patient_id: str,
        org_id: str,
        mood_score: int,
        energy_score: int,
        note: str | None,
        emotions: list[str],
    ) -> str:
        """Create a new mood log entry, returns the entry ID."""
        entry_id = uuid.uuid4()
        await self.db.execute(
            """INSERT INTO mood_logs (id, patient_id, org_id, mood_score,
                                      energy_score, note, emotions, logged_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())""",
            entry_id,
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
            mood_score,
            energy_score,
            note,
            json.dumps(emotions),
        )
        return str(entry_id)

    async def get_mood_history(
        self,
        patient_id: str,
        org_id: str,
        days: int = 30,
    ) -> list[dict]:
        """Get mood log history for the past N days."""
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT id, mood_score, energy_score, note, emotions, logged_at
               FROM mood_logs
               WHERE patient_id=$1 AND org_id=$2
                 AND logged_at > NOW() - ($3 || ' days')::interval
               ORDER BY logged_at ASC""",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
            str(days),
        )
        return [dict(row) for row in rows]

    async def get_patient_assessments(self, patient_id: str) -> list[dict]:
        """Get all assessment results for a patient."""
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT id,
                      assessment_id AS template_id,
                      raw_score AS score_total,
                      severity AS severity_band,
                      interpretation AS interpretation_text,
                      created_at AS taken_at
               FROM assessment_results
               WHERE patient_id=$1
               ORDER BY created_at DESC""",
            uuid.UUID(patient_id),
        )
        return [dict(row) for row in rows]

    async def get_patient_homework(self, patient_id: str, org_id: str) -> list[dict]:
        """Get all homework tasks for a patient."""
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT id, title, description, task_type, status,
                      due_date, assigned_at, patient_feedback
               FROM homework_tasks
               WHERE patient_id=$1 AND org_id=$2
               ORDER BY due_date ASC NULLS LAST""",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return [dict(row) for row in rows]

    async def get_patient_sessions(
        self,
        patient_id: str,
        org_id: str,
        upcoming_only: bool = False,
    ) -> list[dict]:
        """Get session history for a patient."""
        if self.db is None:
            return []
        filter_clause = "AND scheduled_at > NOW()" if upcoming_only else ""
        rows = await self.db.fetch(
            f"""SELECT id, session_type, scheduled_at, duration_minutes,
                       status, summary_snippet
                FROM sessions
                WHERE patient_id=$1 AND org_id=$2 {filter_clause}
                ORDER BY scheduled_at DESC
                LIMIT 20""",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return [dict(row) for row in rows]

    async def create_session_request(
        self,
        patient_id: str,
        org_id: str,
        scheduled_at: datetime | None,
        notes: str | None,
    ) -> dict:
        """Create a session request, returns the created session info."""
        row = await self.db.fetchrow(
            """INSERT INTO sessions
                   (patient_id, org_id, session_type, scheduled_at, status, summary_snippet)
               VALUES ($1, $2, 'Individual', $3, 'requested', $4)
               RETURNING id, status, scheduled_at""",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
            scheduled_at,
            notes,
        )
        return dict(row)

    async def submit_homework(
        self,
        task_id: str,
        patient_id: str,
        org_id: str,
        feedback: dict,
    ) -> bool:
        """Submit homework completion, returns True if task was found and updated."""
        result = await self.db.execute(
            """UPDATE homework_tasks
               SET patient_feedback=$1, status='COMPLETED', completed_at=NOW()
               WHERE id=$2 AND patient_id=$3 AND org_id=$4""",
            json.dumps(feedback),
            uuid.UUID(task_id),
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return result != "UPDATE 0"
