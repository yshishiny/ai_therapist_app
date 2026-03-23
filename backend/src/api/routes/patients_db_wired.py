from fastapi import APIRouter

from backend.src.repositories.patient_repository_db_real import PatientRepositoryDbReal
from backend.src.schemas.patients import PatientCreateIn
from backend.src.services.patient_service_db import PatientServiceDb

router = APIRouter(prefix='/patients', tags=['patients'])


def _service(db=None) -> PatientServiceDb:
    return PatientServiceDb(repository=PatientRepositoryDbReal(db=db))


@router.get('')
async def list_patients(org_id: str = '00000000-0000-0000-0000-000000000000', limit: int = 50, offset: int = 0):
    service = _service()
    return await service.list_patients(org_id=org_id, limit=limit, offset=offset)


@router.get('/{patient_id}')
async def get_patient(patient_id: str, org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.get_patient(patient_id=patient_id, org_id=org_id)


@router.post('')
async def create_patient(body: PatientCreateIn, org_id: str = '00000000-0000-0000-0000-000000000000', therapist_id: str = 'migration-user'):
    service = _service()
    return await service.create_patient(body=body, org_id=org_id, therapist_id=therapist_id)
