from fastapi import APIRouter

from backend.src.schemas.ai_reporting import AiChatMessageIn, ReportGenerationRequest

router = APIRouter(tags=['ai', 'reporting'])


@router.post('/patients/{patient_id}/report/generate')
async def generate_clinical_synthesis(patient_id: str, body: ReportGenerationRequest):
    return {
        'status': 'ai-reporting-scaffold',
        'action': 'generate_clinical_synthesis',
        'patient_id': patient_id,
        'include_homework': body.include_homework,
        'include_assessments': body.include_assessments,
        'include_sessions': body.include_sessions,
    }


@router.post('/me/ai-chat')
async def patient_ai_chat(body: AiChatMessageIn):
    return {
        'status': 'ai-reporting-scaffold',
        'action': 'patient_ai_chat',
        'has_message': bool(body.message),
        'conversation_id': body.conversation_id,
    }
