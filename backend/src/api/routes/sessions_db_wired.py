from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_clinician_context,
    get_session_service,
)
from backend.src.schemas.sessions import SessionNoteIn, SessionNoteOut
from backend.src.services.session_service_db import SessionServiceDb

router = APIRouter(prefix='/patients/{patient_id}/sessions', tags=['sessions'])


@router.get('', response_model=list[SessionNoteOut])
async def list_sessions(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('sessions.view'),
    service: SessionServiceDb = Depends(get_session_service),
):
    return await service.list_sessions(patient_id=patient_id, org_id=context.org_id)


@router.post('', response_model=SessionNoteOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    patient_id: str,
    body: SessionNoteIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('sessions.manage'),
    service: SessionServiceDb = Depends(get_session_service),
):
    result = await service.create_session(patient_id=patient_id, body=body, org_id=context.org_id)
    if not result:
        raise HTTPException(status_code=404, detail='Patient not found.')
    return result
