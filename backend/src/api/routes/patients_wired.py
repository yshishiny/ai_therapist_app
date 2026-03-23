from fastapi import APIRouter

from backend.src.schemas.patients import PatientCreateIn
from backend.src.services.patient_service_wired import PatientServiceWired

router = APIRouter(prefix='/patients', tags=['patients'])
service = PatientServiceWired()


@router.get('')
async def list_patients():
    return await service.list_patients()


@router.get('/{patient_id}')
async def get_patient(patient_id: str):
    return await service.get_patient(patient_id)


@router.post('')
async def create_patient(body: PatientCreateIn):
    return await service.create_patient(body)


@router.get('/health')
async def patients_health():
    return {'status': 'ok', 'module': 'patients', 'mode': 'wired'}
