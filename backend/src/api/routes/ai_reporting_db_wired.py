from fastapi import APIRouter, Depends

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_ai_reporting_service,
    get_clinician_context,
    get_patient_context,
)
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
    context: RequestContext = Depends(get_patient_context),
    service: AiReportingServiceDb = Depends(get_ai_reporting_service),
):
    return await service.patient_ai_chat(
        patient_id=context.patient_id,
        conversation_id=body.conversation_id,
        message=body.message,
    )
