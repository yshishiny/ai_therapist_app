from backend.src.repositories.dashboard_repository_db_real import DashboardRepositoryDbReal


class DashboardServiceDb:
    def __init__(self, repository: DashboardRepositoryDbReal):
        self.repository = repository

    async def get_summary(self, org_id: str) -> dict:
        return await self.repository.get_summary(org_id=org_id)

    async def get_clinician_summary(self, org_id: str, therapist_id: str) -> dict:
        return await self.repository.get_clinician_summary(org_id=org_id, therapist_id=therapist_id)
