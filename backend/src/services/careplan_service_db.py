from fastapi import HTTPException, status

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

    async def get_active_careplan(self, patient_id: str, org_id: str) -> dict:
        """Get the active care plan for a patient."""
        # Verify patient exists
        if not await self.repository.patient_exists(patient_id, org_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found.",
            )

        plan = await self.repository.get_active_careplan(patient_id)
        if plan is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No care plan found.",
            )

        return plan
