from typing import Any


class PatientRepositoryDb:
    def __init__(self, db: Any):
        self.db = db

    async def list_patients(self, limit: int = 50, offset: int = 0) -> list[dict]:
        if self.db is None:
            return []
        return []

    async def get_patient(self, patient_id: str) -> dict | None:
        if self.db is None:
            return None
        return None

    async def create_patient(self, payload: dict) -> dict:
        return payload
