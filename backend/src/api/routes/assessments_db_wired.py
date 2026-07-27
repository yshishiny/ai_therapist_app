from fastapi import APIRouter, Depends, HTTPException, status

from backend.assessment_admin.service import list_available_templates
from backend.core.dependencies_access import require_permission
from backend.src.core.db import DB
from backend.src.core.dependencies import (
    RequestContext,
    get_assessment_service,
    get_clinician_context,
)
from backend.src.schemas.assessments import AssessmentResultOut, SubmitAssessmentIn
from backend.src.services.assessment_service_db import AssessmentServiceDb

router = APIRouter(tags=['assessments'])


@router.get('/patients/{patient_id}/assessments', response_model=list[AssessmentResultOut])
async def list_assessments(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('assessments.view'),
    service: AssessmentServiceDb = Depends(get_assessment_service),
):
    return await service.list_assessments(patient_id=patient_id, org_id=context.org_id)


@router.post('/patients/{patient_id}/assessments', response_model=AssessmentResultOut, status_code=status.HTTP_201_CREATED)
async def submit_assessment(
    patient_id: str,
    body: SubmitAssessmentIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('assessments.assign'),
    service: AssessmentServiceDb = Depends(get_assessment_service),
):
    result = await service.submit_assessment(
        patient_id=patient_id,
        body=body,
        submitted_by=context.user_id,
        org_id=context.org_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail='Patient not found.')
    return result


@router.get('/assessments/templates')
async def list_assessment_templates(
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('assessments.view'),
):
    if db is None:
        return []
    return await list_available_templates(
        db,
        org_id=context.org_id,
        requesting_user_id=context.user_id,
        requesting_user_role=context.role,
    )
