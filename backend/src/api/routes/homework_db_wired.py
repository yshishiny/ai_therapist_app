from fastapi import APIRouter

from backend.src.repositories.homework_repository_db_real import HomeworkRepositoryDbReal
from backend.src.services.homework_service_db import HomeworkServiceDb

router = APIRouter(prefix='/patients/{patient_id}/homework', tags=['homework'])


def _service(db=None) -> HomeworkServiceDb:
    return HomeworkServiceDb(repository=HomeworkRepositoryDbReal(db=db))


@router.get('')
async def list_homework(patient_id: str, org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.list_homework(patient_id=patient_id, org_id=org_id)
