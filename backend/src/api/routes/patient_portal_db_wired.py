from fastapi import APIRouter, Depends, HTTPException, Response, status

from backend.src.core.dependencies import (
    RequestContext,
    get_patient_context,
    get_patient_portal_service,
)
from backend.src.schemas.patient_portal import FcmTokenIn, HomeworkSubmitIn, MoodLogIn, SessionRequestIn
from backend.src.services.patient_portal_service_db import PatientPortalServiceDb

router = APIRouter(prefix='/me', tags=['patient'])


def _patient_id_from_context(context: RequestContext) -> str:
    if context.patient_id is None:
        raise HTTPException(status_code=403, detail='Patient access only.')
    return context.patient_id


@router.post('/fcm-token', status_code=status.HTTP_204_NO_CONTENT)
async def register_fcm_token(
    body: FcmTokenIn,
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    await service.register_fcm_token(patient_id, body.fcm_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get('/profile')
async def get_my_profile(
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    return await service.get_profile(patient_id, context.org_id)


@router.post('/mood', status_code=status.HTTP_201_CREATED)
async def log_mood(
    body: MoodLogIn,
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    return await service.log_mood(patient_id, context.org_id, body)


@router.get('/mood')
async def get_mood_history(
    days: int = 30,
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    return await service.get_mood_history(patient_id, context.org_id, days)


@router.get('/assessments')
async def get_my_assessments(
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    return await service.get_assessments(patient_id)


@router.get('/homework')
async def get_my_homework(
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    return await service.get_homework(patient_id, context.org_id)


@router.get('/sessions')
async def get_my_sessions(
    upcoming_only: bool = False,
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    return await service.get_sessions(patient_id, context.org_id, upcoming_only)


@router.post('/sessions/request', status_code=status.HTTP_201_CREATED)
async def request_session(
    body: SessionRequestIn,
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    return await service.request_session(patient_id, context.org_id, body)


@router.post('/homework/{task_id}/submit')
async def submit_my_homework(
    task_id: str,
    body: HomeworkSubmitIn,
    context: RequestContext = Depends(get_patient_context),
    service: PatientPortalServiceDb = Depends(get_patient_portal_service),
):
    patient_id = _patient_id_from_context(context)
    return await service.submit_homework(task_id, patient_id, context.org_id, body)
