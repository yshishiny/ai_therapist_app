import uuid
from typing import Any


class AuthRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def find_clinician_by_email(self, email: str) -> dict | None:
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            "SELECT id, org_id, role, password_hash FROM clinicians WHERE email = $1",
            email,
        )
        return dict(row) if row else None

    async def find_patient_user_by_email(self, email: str) -> dict | None:
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            """
            SELECT pu.id, pu.org_id, pu.patient_id, pu.password_hash
            FROM patient_users pu
            WHERE pu.email = $1 AND pu.active = TRUE
            """,
            email,
        )
        return dict(row) if row else None

    async def find_patient_account(self, patient_id: str) -> dict | None:
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            "SELECT patient_id, org_id FROM patient_users WHERE patient_id = $1 AND active = TRUE",
            uuid.UUID(patient_id),
        )
        return dict(row) if row else None

    async def find_clinician_account(self, user_id: str) -> dict | None:
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            "SELECT id, org_id, role FROM clinicians WHERE id = $1 AND active = TRUE",
            uuid.UUID(user_id),
        )
        return dict(row) if row else None
