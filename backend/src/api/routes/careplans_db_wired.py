from fastapi import APIRouter

from backend.src.repositories.careplan_repository_db_real import CarePlanRepositoryDbReal
from backend.src.schemas.careplans import CarePlanIn
from backend.src.services.careplan_service_db import CarePlanServiceDb

router = APIRouter(prefix='/patients/{patient_id}/careplans', tags=['careplans'])


def _service(db=None) -> CarePlanServiceDb:
    return CarePlanServiceDb(repository=CarePlanRepositoryDbReal(db=db))


@router.get('')
async def list_careplans(patient_id: str, org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.list_careplans(patient_id=patient_id, org_id=org_id)


@router.post('')
async def create_careplan(patient_id: str, body: CarePlanIn, created_by: str = 'migration-user', org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.create_careplan(patient_id=patient_id, body=body, created_by=created_by, org_id=org_id)
