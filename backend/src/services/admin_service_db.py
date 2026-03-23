from backend.src.repositories.admin_repository_db_real import AdminRepositoryDbReal


class AdminServiceDb:
    def __init__(self, repository: AdminRepositoryDbReal):
        self.repository = repository

    async def list_resources(self, org_id: str) -> list[dict]:
        return await self.repository.list_resources(org_id=org_id)

    async def list_contacts(self, org_id: str) -> list[dict]:
        return await self.repository.list_contacts(org_id=org_id)
