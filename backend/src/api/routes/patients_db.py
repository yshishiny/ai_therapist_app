from fastapi import APIRouter

from backend.src.schemas.patients import PatientCreateIn

router = APIRouter(prefix='/patients', tags=['patients'])


@router.get('')
async def list_patients(org_id: str = '00000000-0000-0000-0000-000000000000', limit: int = 50, offset: int = 0):
    return {
        'status': 'db-route-scaffold',
        'module': 'patients',
        'org_id': org_id,
        'limit': limit,
        'offset': offset,
    }


@router.get('/{patient_id}')
async def get_patient(patient_id: str, org_id: str = '00000000-0000-0000-0000-000000000000'):
    return {
        'status': 'db-route-scaffold',
        'module': 'patients',
        'patient_id': patient_id,
        'org_id': org_id,
    }


@router.post('')
async def create_patient(body: PatientCreateIn, org_id: str = '00000000-0000-0000-0000-000000000000', therapist_id: str = 'migration-user'):
    return {
        'status': 'db-route-scaffold',
        'module': 'patients',
        'org_id': org_id,
        'therapist_id': therapist_id,
        'payload': body.model_dump(),
    }
