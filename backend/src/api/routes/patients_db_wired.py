from fastapi import APIRouter, Depends, HTTPException, status

from backend.src.core.dependencies import (
    RequestContext,
    get_clinician_context,
    get_patient_service,
)
from backend.src.schemas.patients import PatientCreateIn, PatientOut
from backend.src.services.patient_service_db import PatientServiceDb

router = APIRouter(prefix='/patients', tags=['patients'])


@router.get('', response_model=list[PatientOut])
async def list_patients(
    limit: int = 50,
    offset: int = 0,
    context: RequestContext = Depends(get_clinician_context),
    service: PatientServiceDb = Depends(get_patient_service),
):
    return await service.list_patients(org_id=context.org_id, limit=limit, offset=offset)


@router.get('/{patient_id}', response_model=PatientOut)
async def get_patient(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    service: PatientServiceDb = Depends(get_patient_service),
):
    patient = await service.get_patient(patient_id=patient_id, org_id=context.org_id)
    if patient is None:
        raise HTTPException(status_code=404, detail='Patient not found.')
    return patient


@router.post('', response_model=PatientOut, status_code=status.HTTP_201_CREATED)
async def create_patient(
    body: PatientCreateIn,
    context: RequestContext = Depends(get_clinician_context),
    service: PatientServiceDb = Depends(get_patient_service),
):
    return await service.create_patient(
        body=body,
        org_id=context.org_id,
        therapist_id=context.user_id,
    )
