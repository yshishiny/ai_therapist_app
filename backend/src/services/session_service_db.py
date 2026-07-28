from backend.src.repositories.session_repository_db_real import SessionRepositoryDbReal
from backend.src.schemas.sessions import SessionNoteIn


class SessionServiceDb:
    def __init__(self, repository: SessionRepositoryDbReal):
        self.repository = repository

    async def list_sessions(self, patient_id: str, org_id: str) -> list[dict]:
        return await self.repository.list_sessions(patient_id=patient_id, org_id=org_id)

    async def create_session(self, patient_id: str, body: SessionNoteIn, org_id: str) -> dict:
        return await self.repository.create_session(
            patient_id=patient_id,
            payload=body.model_dump(),
            org_id=org_id,
        )

    async def set_note_approval(
        self, patient_id: str, note_id: str, org_id: str, therapist_approved: bool
    ) -> dict | None:
        return await self.repository.set_note_approval(
            patient_id=patient_id,
            note_id=note_id,
            org_id=org_id,
            therapist_approved=therapist_approved,
        )
