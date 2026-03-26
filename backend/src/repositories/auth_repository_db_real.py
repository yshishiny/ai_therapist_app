import uuid
from datetime import date
from typing import Any


class AuthRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def patient_email_exists(self, email: str) -> bool:
        """Check if a patient user with this email already exists."""
        if self.db is None:
            return False
        result = await self.db.fetchval(
            "SELECT 1 FROM patient_users WHERE email = $1",
            email,
        )
        return result is not None

    async def get_default_org_id(self) -> str | None:
        """Get the default organisation ID."""
        if self.db is None:
            return None
        org_id = await self.db.fetchval("SELECT id FROM organisations LIMIT 1")
        return str(org_id) if org_id else None

    async def register_patient(
        self,
        email: str,
        password_hash: str,
        full_name: str,
        gender: str | None,
        dob: date | None,
        org_id: str,
    ) -> str:
        """Register a new patient and patient_user, returns the patient_id."""
        patient_id = uuid.uuid4()
        patient_user_id = uuid.uuid4()
        org_uuid = uuid.UUID(org_id)

        # Insert into patients table
        await self.db.execute(
            """INSERT INTO patients (id, org_id, therapist_id, full_name, name, gender, dob, email, status, risk)
               VALUES ($1, $2, 'unassigned', $3, $4, $5, $6, $7, 'Active', 'Low')""",
            patient_id,
            org_uuid,
            full_name,
            full_name.split()[0],
            gender,
            dob,
            email,
        )

        # Insert into patient_users table
        await self.db.execute(
            """INSERT INTO patient_users (id, org_id, patient_id, email, password_hash)
               VALUES ($1, $2, $3, $4, $5)""",
            patient_user_id,
            org_uuid,
            patient_id,
            email,
            password_hash,
        )

        return str(patient_id)

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
