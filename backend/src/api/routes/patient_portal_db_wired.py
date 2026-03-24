import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.encoders import jsonable_encoder

from backend.src.core.db import DB
from backend.src.core.dependencies import RequestContext, get_patient_context
from backend.src.schemas.patient_portal import FcmTokenIn, HomeworkSubmitIn, MoodLogIn, SessionRequestIn

router = APIRouter(prefix='/me', tags=['patient'])


def _patient_id_from_context(context: RequestContext) -> str:
    if context.patient_id is None:
        raise HTTPException(status_code=403, detail='Patient access only.')
    return context.patient_id


def _row_to_json(row) -> dict | None:
    if row is None:
        return None
    return jsonable_encoder(dict(row))


def _rows_to_json(rows) -> list[dict]:
    return [_row_to_json(row) for row in rows]


@router.post('/fcm-token', status_code=status.HTTP_204_NO_CONTENT)
async def register_fcm_token(
    body: FcmTokenIn,
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    await db.execute(
        'UPDATE patient_users SET fcm_token = $1 WHERE patient_id = $2',
        body.fcm_token,
        uuid.UUID(patient_id),
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get('/profile')
async def get_my_profile(
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    row = await db.fetchrow(
        """SELECT id, full_name, gender, dob,
                  diagnosis AS primary_diagnosis,
                  diagnosis,
                  status,
                  risk AS risk_level,
                  risk,
                  therapist_id
           FROM patients
           WHERE id=$1 AND org_id=$2""",
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
    )
    if row is None:
        raise HTTPException(status_code=404, detail='Patient profile not found.')
    return _row_to_json(row)


@router.post('/mood', status_code=status.HTTP_201_CREATED)
async def log_mood(
    body: MoodLogIn,
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    entry_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO mood_logs (id, patient_id, org_id, mood_score,
                                  energy_score, note, emotions, logged_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())""",
        entry_id,
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
        body.mood_score,
        body.energy_score,
        body.note,
        json.dumps(body.emotions),
    )
    return {'id': str(entry_id), 'status': 'logged'}


@router.get('/mood')
async def get_mood_history(
    db: DB,
    days: int = 30,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    rows = await db.fetch(
        """SELECT id, mood_score, energy_score, note, emotions, logged_at
           FROM mood_logs
           WHERE patient_id=$1 AND org_id=$2
             AND logged_at > NOW() - ($3 || ' days')::interval
           ORDER BY logged_at ASC""",
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
        str(days),
    )
    return _rows_to_json(rows)


@router.get('/assessments')
async def get_my_assessments(
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    rows = await db.fetch(
        """SELECT id,
                  assessment_id AS template_id,
                  raw_score AS score_total,
                  severity AS severity_band,
                  interpretation AS interpretation_text,
                  created_at AS taken_at
           FROM assessment_results
           WHERE patient_id=$1
           ORDER BY created_at DESC""",
        uuid.UUID(patient_id),
    )
    return _rows_to_json(rows)


@router.get('/homework')
async def get_my_homework(
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    rows = await db.fetch(
        """SELECT id, title, description, task_type, status,
                  due_date, assigned_at, patient_feedback
           FROM homework_tasks
           WHERE patient_id=$1 AND org_id=$2
           ORDER BY due_date ASC NULLS LAST""",
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
    )
    items = _rows_to_json(rows)
    for item in items:
        item['status'] = str(item.get('status', '')).lower()
        feedback = item.get('patient_feedback')
        if isinstance(feedback, str) and feedback:
            try:
                item['patient_feedback'] = json.loads(feedback)
            except json.JSONDecodeError:
                pass
    return items


@router.get('/sessions')
async def get_my_sessions(
    db: DB,
    upcoming_only: bool = False,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    filter_clause = "AND scheduled_at > NOW()" if upcoming_only else ""
    rows = await db.fetch(
        f"""SELECT id, session_type, scheduled_at, duration_minutes,
                   status, summary_snippet
            FROM sessions
            WHERE patient_id=$1 AND org_id=$2 {filter_clause}
            ORDER BY scheduled_at DESC
            LIMIT 20""",
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
    )
    return _rows_to_json(rows)


@router.post('/sessions/request', status_code=status.HTTP_201_CREATED)
async def request_session(
    body: SessionRequestIn,
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    scheduled_at = None
    if body.preferred_date:
        try:
            scheduled_at = datetime.strptime(body.preferred_date, '%Y-%m-%d')
        except ValueError as exc:
            raise HTTPException(status_code=400, detail='preferred_date must be YYYY-MM-DD') from exc

    row = await db.fetchrow(
        """INSERT INTO sessions
               (patient_id, org_id, session_type, scheduled_at, status, summary_snippet)
           VALUES ($1, $2, 'Individual', $3, 'requested', $4)
           RETURNING id, status, scheduled_at""",
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
        scheduled_at,
        body.notes or None,
    )
    return {'id': str(row['id']), 'status': row['status'], 'scheduled_at': row['scheduled_at']}


@router.post('/homework/{task_id}/submit')
async def submit_my_homework(
    task_id: str,
    body: HomeworkSubmitIn,
    db: DB,
    context: RequestContext = Depends(get_patient_context),
):
    patient_id = _patient_id_from_context(context)
    feedback = json.dumps(
        {
            'notes': body.completion_notes,
            'helpfulness_rating': body.helpfulness_rating,
        }
    )
    result = await db.execute(
        """UPDATE homework_tasks
           SET patient_feedback=$1, status='COMPLETED', completed_at=NOW()
           WHERE id=$2 AND patient_id=$3 AND org_id=$4""",
        feedback,
        uuid.UUID(task_id),
        uuid.UUID(patient_id),
        uuid.UUID(context.org_id),
    )
    if result == 'UPDATE 0':
        raise HTTPException(status_code=404, detail='Task not found.')
    return {'status': 'submitted'}
