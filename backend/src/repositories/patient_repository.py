class PatientRepository:
    async def list_patients(self) -> list[dict]:
        return []

    async def get_patient(self, patient_id: str) -> dict | None:
        return None

    async def create_patient(self, payload: dict) -> dict:
        return payload
