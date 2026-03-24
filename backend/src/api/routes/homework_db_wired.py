import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from backend.src.core.db import DB
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
    service: HomeworkServiceDb = Depends(get_homework_service),
):
    return await service.list_homework(patient_id=patient_id, org_id=context.org_id)


@router.post('/patients/{patient_id}/homework', response_model=HomeworkOut, status_code=status.HTTP_201_CREATED)
async def create_homework(
    patient_id: str,
    body: HomeworkIn,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    exists = await db.fetchval(
        'SELECT 1 FROM patients WHERE id=$1 AND org_id=$2',
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail='Patient not found.')

    due_date = None
    if body.due_date:
        try:
            due_date = datetime.strptime(body.due_date, '%Y-%m-%d').date()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail='due_date must be YYYY-MM-DD.') from exc

    now = datetime.now(timezone.utc)
    row = await db.fetchrow(
        """INSERT INTO homework_tasks
               (id, patient_id, org_id, title, description, instructions, due_date, status, assigned_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'ASSIGNED', $7)
           RETURNING id, patient_id, careplan_phase_id, title, description, instructions,
                     task_type, due_date::text AS due_date, status, patient_feedback,
                     therapist_notes, assigned_at, completed_at""",
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
        body.title,
        body.instructions,
        body.instructions,
        due_date,
        now,
    )
    return dict(row)


@router.post('/homework/{task_id}/feedback')
async def submit_homework_feedback(
    task_id: str,
    body: HomeworkFeedbackIn,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    status_value = (
        'COMPLETED'
        if body.completionPercentage == 100
        else ('SKIPPED' if body.completionPercentage == 0 else 'PARTIALLY_DONE')
    )
    result = await db.execute(
        """UPDATE homework_tasks ht
           SET patient_feedback=$1, status=$2
           FROM patients p
           WHERE ht.id = $3 AND ht.patient_id = p.id AND p.org_id = $4""",
        json.dumps(body.model_dump()),
        status_value,
        uuid.UUID(task_id),
        uuid.UUID(context.org_id),
    )
    if result == 'UPDATE 0':
        raise HTTPException(status_code=404, detail='Homework task not found.')
    return {'status': 'success', 'new_status': status_value}
