import uuid

from fastapi import APIRouter, Depends, HTTPException

from backend.src.core.db import DB
from backend.src.core.dependencies import (
    RequestContext,
    get_clinician_context,
    get_patient_context,
)
from backend.src.schemas.ai_reporting import AiChatMessageIn, ReportGenerationRequest

router = APIRouter(tags=['ai', 'reporting'])


@router.post('/patients/{patient_id}/report/generate')
async def generate_clinical_synthesis(
    patient_id: str,
    body: ReportGenerationRequest,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    patient = await db.fetchrow(
        """SELECT full_name, diagnosis, risk, status
           FROM patients
           WHERE id=$1 AND org_id=$2""",
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
    )
    if patient is None:
        raise HTTPException(status_code=404, detail='Patient not found.')

    sections = [
        '# Clinical Synthesis',
        '',
        f"## Patient",
        f"- Name: {patient['full_name']}",
        f"- Diagnosis: {patient['diagnosis'] or 'Not documented'}",
        f"- Risk: {patient['risk'] or 'Unknown'}",
        f"- Status: {patient['status'] or 'Unknown'}",
    ]

    if body.include_sessions:
        sessions = await db.fetch(
            """SELECT template, assessment, plan, created_at
               FROM session_notes
               WHERE patient_id=$1
               ORDER BY created_at DESC
               LIMIT 5""",
            uuid.UUID(patient_id),
        )
        sections.extend(['', '## Recent Sessions'])
        if sessions:
            for session in sessions:
                sections.append(
                    f"- {session['created_at']}: {session['template']} | assessment: {session['assessment'] or 'n/a'} | plan: {session['plan'] or 'n/a'}"
                )
        else:
            sections.append('- No recent session notes were found.')

    if body.include_assessments:
        assessments = await db.fetch(
            """SELECT assessment_id, raw_score, severity, created_at
               FROM assessment_results
               WHERE patient_id=$1
               ORDER BY created_at DESC
               LIMIT 10""",
            uuid.UUID(patient_id),
        )
        sections.extend(['', '## Assessments'])
        if assessments:
            for assessment in assessments:
                sections.append(
                    f"- {assessment['created_at']}: {assessment['assessment_id']} scored {assessment['raw_score']} ({assessment['severity']})"
                )
        else:
            sections.append('- No assessment results were found.')

    if body.include_homework:
        homework = await db.fetch(
            """SELECT title, status, due_date
               FROM homework_tasks
               WHERE patient_id=$1
               ORDER BY due_date DESC NULLS LAST
               LIMIT 10""",
            uuid.UUID(patient_id),
        )
        sections.extend(['', '## Homework'])
        if homework:
            for item in homework:
                sections.append(
                    f"- {item['title']}: {item['status']} (due {item['due_date'] or 'unspecified'})"
                )
        else:
            sections.append('- No homework records were found.')

    return {
        'status': 'completed',
        'patient_id': patient_id,
        'requested_by': context.user_id,
        'report_id': str(uuid.uuid4()),
        'report_markdown': '\n'.join(sections),
    }


@router.post('/me/ai-chat')
async def patient_ai_chat(
    body: AiChatMessageIn,
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    del db
    reply = (
        "I hear you. Let's slow this down together. "
        "Notice what feels strongest right now, take one steady breath, "
        "and name one small supportive step you can take before your next session."
    )
    return {
        'patient_id': context.patient_id,
        'conversation_id': body.conversation_id or str(uuid.uuid4()),
        'reply': reply,
    }
