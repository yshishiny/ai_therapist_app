from fastapi import APIRouter, Depends, status

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_clinician_context,
    get_homework_service,
)
from backend.src.schemas.homework import HomeworkFeedbackIn, HomeworkIn, HomeworkOut
from backend.src.services.homework_service_db import HomeworkServiceDb

router = APIRouter(tags=['homework'])


@router.get('/patients/{patient_id}/homework', response_model=list[HomeworkOut])
async def list_homework(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('homework.view'),
    service: HomeworkServiceDb = Depends(get_homework_service),
):
    return await service.list_homework(patient_id=patient_id, org_id=context.org_id)


@router.post('/patients/{patient_id}/homework', response_model=HomeworkOut, status_code=status.HTTP_201_CREATED)
async def create_homework(
    patient_id: str,
    body: HomeworkIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('homework.manage'),
    service: HomeworkServiceDb = Depends(get_homework_service),
):
    return await service.create_homework(
        patient_id=patient_id,
        org_id=context.org_id,
        body=body,
    )


@router.post('/homework/{task_id}/feedback')
async def submit_homework_feedback(
    task_id: str,
    body: HomeworkFeedbackIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('homework.manage'),
    service: HomeworkServiceDb = Depends(get_homework_service),
):
    return await service.submit_feedback(
        task_id=task_id,
        org_id=context.org_id,
        body=body,
    )
