from datetime import datetime

from fastapi import HTTPException, status

from backend.src.repositories.homework_repository_db_real import HomeworkRepositoryDbReal
from backend.src.schemas.homework import HomeworkFeedbackIn, HomeworkIn


class HomeworkServiceDb:
    def __init__(self, repository: HomeworkRepositoryDbReal):
        self.repository = repository

    async def list_homework(self, patient_id: str, org_id: str) -> list[dict]:
        return await self.repository.list_homework(patient_id=patient_id, org_id=org_id)

    async def create_homework(
        self,
        patient_id: str,
        org_id: str,
        body: HomeworkIn,
    ) -> dict:
        """Create a new homework task."""
        # Verify patient exists
        if not await self.repository.patient_exists(patient_id, org_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found.",
            )

        # Parse due date if provided
        due_date = None
        if body.due_date:
            try:
                due_date = datetime.strptime(body.due_date, "%Y-%m-%d").date()
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="due_date must be YYYY-MM-DD.",
                ) from exc

        return await self.repository.create_homework(
            patient_id=patient_id,
            org_id=org_id,
            title=body.title,
            instructions=body.instructions,
            due_date=due_date,
        )

    async def submit_feedback(
        self,
        task_id: str,
        org_id: str,
        body: HomeworkFeedbackIn,
    ) -> dict:
        """Submit feedback for a homework task."""
        # Determine status based on completion percentage
        if body.completionPercentage == 100:
            new_status = "COMPLETED"
        elif body.completionPercentage == 0:
            new_status = "SKIPPED"
        else:
            new_status = "PARTIALLY_DONE"

        updated = await self.repository.submit_feedback(
            task_id=task_id,
            org_id=org_id,
            feedback=body.model_dump(),
            new_status=new_status,
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homework task not found.",
            )

        return {"status": "success", "new_status": new_status}
