from backend.src.repositories.patient_repository_db_real import PatientRepositoryDbReal
from backend.src.schemas.patients import PatientCreateIn


class PatientServiceDb:
    def __init__(self, repository: PatientRepositoryDbReal):
        self.repository = repository

    async def list_patients(self, org_id: str, limit: int = 50, offset: int = 0) -> list[dict]:
        return await self.repository.list_patients(org_id=org_id, limit=limit, offset=offset)

    async def get_patient(self, patient_id: str, org_id: str) -> dict | None:
        return await self.repository.get_patient(patient_id=patient_id, org_id=org_id)

    async def create_patient(self, body: PatientCreateIn, org_id: str, therapist_id: str) -> dict:
        return await self.repository.create_patient(
            payload=body.model_dump(),
            org_id=org_id,
            therapist_id=therapist_id,
        )
