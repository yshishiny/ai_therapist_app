from backend.src.repositories.clinician_repository_db_real import ClinicianRepositoryDbReal


class ClinicianServiceDb:
    def __init__(self, repository: ClinicianRepositoryDbReal):
        self.repository = repository

    async def list_clinicians(self, org_id: str) -> list[dict]:
        return await self.repository.list_clinicians(org_id=org_id)

    async def clinician_exists(self, clinician_id: str, org_id: str) -> bool:
        return await self.repository.clinician_exists(clinician_id=clinician_id, org_id=org_id)
