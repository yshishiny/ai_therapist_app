from backend.src.repositories.assessment_repository_db_real import AssessmentRepositoryDbReal
from backend.src.schemas.assessments import SubmitAssessmentIn


class AssessmentServiceDb:
    def __init__(self, repository: AssessmentRepositoryDbReal):
        self.repository = repository

    async def list_assessments(self, patient_id: str, org_id: str) -> list[dict]:
        return await self.repository.list_assessments(patient_id=patient_id, org_id=org_id)

    async def submit_assessment(self, patient_id: str, body: SubmitAssessmentIn, submitted_by: str, org_id: str) -> dict:
        return await self.repository.submit_assessment(
            patient_id=patient_id,
            payload=body.model_dump(),
            submitted_by=submitted_by,
            org_id=org_id,
        )

    async def list_templates(self) -> list[dict]:
        """List all assessment templates."""
        return await self.repository.list_templates()
