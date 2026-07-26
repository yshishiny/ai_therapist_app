from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth import Role
from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_admin_service,
    get_clinician_context,
)
from backend.src.schemas.admin import (
    AssessmentQuestionIn,
    AssessmentQuestionOut,
    ContactIn,
    ContactOut,
    ResourceIn,
    ResourceOut,
)
from backend.src.services.admin_service_db import AdminServiceDb

router = APIRouter(prefix='/admin', tags=['admin'])


def _require_admin(context: RequestContext) -> None:
    if context.role != Role.ADMIN.value:
        raise HTTPException(status_code=403, detail='Admin access required.')


@router.get('/resources', response_model=list[ResourceOut])
async def list_resources(
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('content_library.view'),
    service: AdminServiceDb = Depends(get_admin_service),
):
    return await service.list_resources(org_id=context.org_id)


@router.get('/contacts', response_model=list[ContactOut])
async def list_contacts(
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('content_library.view'),
    service: AdminServiceDb = Depends(get_admin_service),
):
    return await service.list_contacts(org_id=context.org_id)


@router.post('/resources', response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def create_resource(
    body: ResourceIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('admin_content.manage'),
    service: AdminServiceDb = Depends(get_admin_service),
):
    _require_admin(context)
    return await service.create_resource(
        org_id=context.org_id,
        user_id=context.user_id,
        body=body,
    )


@router.post('/contacts', response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('admin_content.manage'),
    service: AdminServiceDb = Depends(get_admin_service),
):
    _require_admin(context)
    return await service.create_contact(org_id=context.org_id, body=body)


@router.get('/assessments/{assessment_id}/questions', response_model=list[AssessmentQuestionOut])
async def list_assessment_questions(
    assessment_id: str,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('assessments.view'),
    service: AdminServiceDb = Depends(get_admin_service),
):
    return await service.list_assessment_questions(
        org_id=context.org_id,
        assessment_id=assessment_id,
    )


@router.post('/assessments/{assessment_id}/questions', response_model=AssessmentQuestionOut, status_code=status.HTTP_201_CREATED)
async def create_assessment_question(
    assessment_id: str,
    body: AssessmentQuestionIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('admin_content.manage'),
    service: AdminServiceDb = Depends(get_admin_service),
):
    _require_admin(context)
    return await service.create_assessment_question(
        org_id=context.org_id,
        assessment_id=assessment_id,
        body=body,
    )
