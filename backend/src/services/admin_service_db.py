from backend.src.repositories.admin_repository_db_real import AdminRepositoryDbReal
from backend.src.schemas.admin import (
    AssessmentQuestionIn,
    ContactIn,
    ResourceIn,
)


class AdminServiceDb:
    def __init__(self, repository: AdminRepositoryDbReal):
        self.repository = repository

    async def list_resources(self, org_id: str) -> list[dict]:
        return await self.repository.list_resources(org_id=org_id)

    async def create_resource(
        self,
        org_id: str,
        user_id: str,
        body: ResourceIn,
    ) -> dict:
        return await self.repository.create_resource(
            org_id=org_id,
            user_id=user_id,
            title=body.title,
            author=body.author,
            category=body.category,
            description=body.description,
            file_url=body.file_url,
            tags=body.tags,
        )

    async def list_contacts(self, org_id: str) -> list[dict]:
        return await self.repository.list_contacts(org_id=org_id)

    async def create_contact(self, org_id: str, body: ContactIn) -> dict:
        return await self.repository.create_contact(
            org_id=org_id,
            full_name=body.full_name,
            email=body.email,
            phone=body.phone,
            role=body.role,
            organisation=body.organisation,
            notes=body.notes,
        )

    async def list_assessment_questions(
        self,
        org_id: str,
        assessment_id: str,
    ) -> list[dict]:
        return await self.repository.list_assessment_questions(
            org_id=org_id,
            assessment_id=assessment_id,
        )

    async def create_assessment_question(
        self,
        org_id: str,
        assessment_id: str,
        body: AssessmentQuestionIn,
    ) -> dict:
        return await self.repository.create_assessment_question(
            org_id=org_id,
            assessment_id=assessment_id,
            question_index=body.question_index,
            question_text=body.question_text,
            response_type=body.response_type,
            options=body.options,
            reverse_scored=body.reverse_scored,
        )
