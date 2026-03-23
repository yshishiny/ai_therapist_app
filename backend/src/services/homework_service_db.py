from backend.src.repositories.homework_repository_db_real import HomeworkRepositoryDbReal


class HomeworkServiceDb:
    def __init__(self, repository: HomeworkRepositoryDbReal):
        self.repository = repository

    async def list_homework(self, patient_id: str, org_id: str) -> list[dict]:
        return await self.repository.list_homework(patient_id=patient_id, org_id=org_id)
