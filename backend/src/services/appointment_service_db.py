from backend.src.repositories.appointment_repository_db_real import AppointmentRepositoryDbReal


class AppointmentServiceDb:
    def __init__(self, repository: AppointmentRepositoryDbReal):
        self.repository = repository

    async def list_appointments(self, org_id: str) -> list[dict]:
        return await self.repository.list_appointments(org_id=org_id)
