from fastapi import APIRouter, Depends

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_ai_reporting_service,
    get_clinician_context,
    get_patient_context,
)
from backend.ai_service import AiService
from backend.core.dependencies_access import DB
from backend.patient_chat.service import PatientChatService
from backend.src.schemas.ai_reporting import AiChatMessageIn, ReportGenerationRequest
from backend.src.services.ai_reporting_service_db import AiReportingServiceDb

router = APIRouter(tags=['ai', 'reporting'])


@router.post('/patients/{patient_id}/report/generate')
async def generate_clinical_synthesis(
    patient_id: str,
    body: ReportGenerationRequest,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('ai.use'),
    service: AiReportingServiceDb = Depends(get_ai_reporting_service),
):
    return await service.generate_clinical_synthesis(
        patient_id=patient_id,
        org_id=context.org_id,
        user_id=context.user_id,
        body=body,
    )


@router.post('/me/ai-chat')
async def patient_ai_chat(
    body: AiChatMessageIn,
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    """The patient companion.

    Every message is screened for crisis language before the model sees it, and
    a crisis signal raises a risk flag against the patient so their clinician
    is told -- see backend/patient_chat/.
    """
    service = PatientChatService(db, AiService('claude', timeout=25.0))
    return await service.reply(
        patient_id=context.patient_id,
        org_id=context.org_id,
        message=body.message,
        conversation_id=body.conversation_id,
    )


@router.get('/me/ai-chat')
async def patient_ai_chat_history(
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    """The stored conversation, so it survives a reload. Previously the chat
    was held in browser memory only and vanished on refresh."""
    service = PatientChatService(db, AiService('claude', timeout=25.0))
    return await service.history(patient_id=context.patient_id)
