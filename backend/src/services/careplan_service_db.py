from backend.src.repositories.careplan_repository_db_real import CarePlanRepositoryDbReal
from backend.src.schemas.careplans import CarePlanIn


class CarePlanServiceDb:
    def __init__(self, repository: CarePlanRepositoryDbReal):
        self.repository = repository

    async def list_careplans(self, patient_id: str, org_id: str) -> list[dict]:
        return await self.repository.list_careplans(patient_id=patient_id, org_id=org_id)

    async def create_careplan(self, patient_id: str, body: CarePlanIn, created_by: str, org_id: str) -> dict:
        return await self.repository.create_careplan(
            patient_id=patient_id,
            payload=body.model_dump(),
            created_by=created_by,
            org_id=org_id,
        )
