import uuid
from datetime import datetime, timezone
from typing import Any


class AssessmentRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_assessments(self, patient_id: str, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """
            SELECT ar.id, ar.patient_id, ar.assessment_id,
                   ar.raw_score, ar.severity, ar.interpretation, ar.created_at
            FROM assessment_results ar
            JOIN patients p ON p.id = ar.patient_id
            WHERE ar.patient_id = $1 AND p.org_id = $2
            ORDER BY ar.created_at DESC
            """,
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return [dict(r) for r in rows]

    async def submit_assessment(self, patient_id: str, payload: dict, submitted_by: str, org_id: str) -> dict:
        if self.db is None:
            return payload
        exists = await self.db.fetchval(
            "SELECT 1 FROM patients WHERE id = $1 AND org_id = $2",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        if not exists:
            return {}
        new_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        await self.db.execute(
            """
            INSERT INTO assessment_results
                (id, patient_id, assessment_id, raw_score, severity,
                 interpretation, answers, submitted_by, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
            """,
            new_id,
            uuid.UUID(patient_id),
            payload['assessment_id'],
            payload['raw_score'],
            payload['severity'],
            payload['interpretation'],
            str(payload['answers']),
            uuid.UUID(submitted_by),
            now,
        )
        return {
            'id': str(new_id),
            'patient_id': patient_id,
            'assessment_id': payload['assessment_id'],
            'raw_score': payload['raw_score'],
            'severity': payload['severity'],
            'interpretation': payload['interpretation'],
            'created_at': now,
        }
