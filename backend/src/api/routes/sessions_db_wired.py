from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_clinician_context,
    get_session_service,
)
from backend.src.schemas.sessions import SessionNoteApprovalIn, SessionNoteIn, SessionNoteOut
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


@router.patch('/{note_id}', response_model=SessionNoteOut)
async def set_note_approval(
    patient_id: str,
    note_id: str,
    body: SessionNoteApprovalIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('sessions.manage'),
    service: SessionServiceDb = Depends(get_session_service),
):
    """Sign a session note off, or withdraw the sign-off.

    Nothing in the product set `therapist_approved` before this route existed,
    so the dashboard's "Notes due" list could only ever grow: every note stayed
    pending forever. That query is
    `WHERE p.org_id = ? AND p.therapist_id = ? AND sn.therapist_approved = FALSE`
    (dashboard_repository_db_real.get_clinician_summary), so flipping the
    column to TRUE here drops the note out of both the list and the count.

    Org scoping runs through the patient, matching the sibling GET/POST on this
    router. A note in another org is reported as 404, not 403 -- the caller
    should not learn that the id exists.
    """
    result = await service.set_note_approval(
        patient_id=patient_id,
        note_id=note_id,
        org_id=context.org_id,
        therapist_approved=body.therapist_approved,
    )
    if not result:
        raise HTTPException(status_code=404, detail='Session note not found.')
    return result
