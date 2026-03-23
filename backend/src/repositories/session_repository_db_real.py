import uuid
from datetime import datetime, timezone
from typing import Any


class SessionRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_sessions(self, patient_id: str, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        exists = await self.db.fetchval(
            "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        if not exists:
            return []
        rows = await self.db.fetch(
            """SELECT id, patient_id, template, subjective, objective, assessment,
                      plan, free_text, ai_draft_summary, created_at
               FROM session_notes WHERE patient_id=$1 ORDER BY created_at DESC""",
            uuid.UUID(patient_id),
        )
        return [dict(r) for r in rows]

    async def create_session(self, patient_id: str, payload: dict, org_id: str) -> dict:
        if self.db is None:
            return payload
        exists = await self.db.fetchval(
            "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        if not exists:
            return {}
        new_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        await self.db.execute(
            """INSERT INTO session_notes
                   (id, patient_id, template, subjective, objective, assessment,
                    plan, free_text, ai_draft_summary, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)""",
            new_id,
            uuid.UUID(patient_id),
            payload.get('template', 'SOAP'),
            payload.get('subjective'),
            payload.get('objective'),
            payload.get('assessment'),
            payload.get('plan'),
            payload.get('free_text'),
            payload.get('ai_draft_summary'),
            now,
        )
        await self.db.execute(
            "UPDATE patients SET last_seen=$1 WHERE id=$2",
            now,
            uuid.UUID(patient_id),
        )
        return {
            'id': str(new_id),
            'patient_id': patient_id,
            'template': payload.get('template', 'SOAP'),
            'subjective': payload.get('subjective'),
            'objective': payload.get('objective'),
            'assessment': payload.get('assessment'),
            'plan': payload.get('plan'),
            'free_text': payload.get('free_text'),
            'ai_draft_summary': payload.get('ai_draft_summary'),
            'created_at': now,
        }
