from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_careplan_service,
    get_clinician_context,
)
from backend.src.schemas.careplans import CarePlanIn, CarePlanOut
from backend.src.services.careplan_service_db import CarePlanServiceDb

router = APIRouter(prefix='/patients/{patient_id}/careplans', tags=['careplans'])


@router.get('', response_model=list[CarePlanOut])
async def list_careplans(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('careplans.view'),
    service: CarePlanServiceDb = Depends(get_careplan_service),
):
    return await service.list_careplans(patient_id=patient_id, org_id=context.org_id)


@router.post('', response_model=CarePlanOut, status_code=status.HTTP_201_CREATED)
async def create_careplan(
    patient_id: str,
    body: CarePlanIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('careplans.manage'),
    service: CarePlanServiceDb = Depends(get_careplan_service),
):
    result = await service.create_careplan(
        patient_id=patient_id,
        body=body,
        created_by=context.user_id,
        org_id=context.org_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail='Patient not found.')
    return result


@router.get('/active')
async def get_active_careplan(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('careplans.view'),
    service: CarePlanServiceDb = Depends(get_careplan_service),
):
    return await service.get_active_careplan(patient_id=patient_id, org_id=context.org_id)
