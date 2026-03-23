from typing import Any


class AuthRepositoryDb:
    def __init__(self, db: Any):
        self.db = db

    async def find_clinician_by_email(self, email: str) -> dict | None:
        if self.db is None:
            return None
        return None

    async def find_patient_user_by_email(self, email: str) -> dict | None:
        if self.db is None:
            return None
        return None
