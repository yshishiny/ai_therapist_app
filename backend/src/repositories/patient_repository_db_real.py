import uuid
from datetime import datetime, timezone
from typing import Any


class PatientRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_patients(self, org_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """
            SELECT id, name, status, risk, diagnosis, last_seen
            FROM patients
            WHERE org_id = $1
            ORDER BY last_seen DESC NULLS LAST
            LIMIT $2 OFFSET $3
            """,
            uuid.UUID(org_id),
            limit,
            offset,
        )
        return [self._row_to_dict(r) for r in rows]

    async def get_patient(self, patient_id: str, org_id: str) -> dict | None:
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            """
            SELECT id, name, status, risk, diagnosis, last_seen
            FROM patients
            WHERE id = $1 AND org_id = $2
            """,
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return self._row_to_dict(row) if row else None

    @staticmethod
    def _row_to_dict(row: Any) -> dict:
        data = dict(row)
        data["id"] = str(data["id"])
        data["diagnosis"] = data.get("diagnosis") or ""
        return data

    async def create_patient(self, payload: dict, org_id: str, therapist_id: str) -> dict:
        if self.db is None:
            return payload
        new_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        await self.db.execute(
            """
            INSERT INTO patients
                (id, org_id, therapist_id, name, full_name, gender,
                 diagnosis, risk, status, phone, email, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$11)
            """,
            new_id,
            uuid.UUID(org_id),
            therapist_id,
            payload['full_name'],
            payload.get('gender'),
            payload.get('diagnosis', ''),
            payload.get('risk', 'Low'),
            payload.get('status', 'Active'),
            payload.get('phone'),
            payload.get('email'),
            now,
        )
        return {
            'id': str(new_id),
            'name': payload['full_name'],
            'status': payload.get('status', 'Active'),
            'risk': payload.get('risk', 'Low'),
            'diagnosis': payload.get('diagnosis', ''),
            'last_seen': None,
        }
