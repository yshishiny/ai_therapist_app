import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth import Role
from backend.src.core.dependencies import (
    RequestContext,
    get_admin_service,
    get_clinician_context,
)
from backend.src.core.db import DB
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
    service: AdminServiceDb = Depends(get_admin_service),
):
    return await service.list_resources(org_id=context.org_id)


@router.get('/contacts', response_model=list[ContactOut])
async def list_contacts(
    context: RequestContext = Depends(get_clinician_context),
    service: AdminServiceDb = Depends(get_admin_service),
):
    return await service.list_contacts(org_id=context.org_id)


@router.post('/resources', response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
async def create_resource(
    body: ResourceIn,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    _require_admin(context)
    now = datetime.now(timezone.utc)
    row = await db.fetchrow(
        """INSERT INTO resources
               (id, org_id, uploaded_by, title, author, category,
                description, file_url, tags, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
           RETURNING id, title, author, category, description, file_url, created_at""",
        uuid.uuid4(),
        uuid.UUID(context.org_id),
        uuid.UUID(context.user_id),
        body.title,
        body.author,
        body.category,
        body.description,
        body.file_url,
        json.dumps(body.tags),
        now,
    )
    return dict(row)


@router.post('/contacts', response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(
    body: ContactIn,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    _require_admin(context)
    row = await db.fetchrow(
        """INSERT INTO contacts
               (id, org_id, full_name, email, phone, role, organisation, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, full_name, email, phone, role, organisation""",
        uuid.uuid4(),
        uuid.UUID(context.org_id),
        body.full_name,
        body.email,
        body.phone,
        body.role,
        body.organisation,
        body.notes,
    )
    return dict(row)


@router.get('/assessments/{assessment_id}/questions', response_model=list[AssessmentQuestionOut])
async def list_assessment_questions(
    assessment_id: str,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    rows = await db.fetch(
        """SELECT id, assessment_id, question_index, question_text,
                  response_type, options
           FROM assessment_questions
           WHERE org_id=$1 AND assessment_id=$2
           ORDER BY question_index ASC""",
        uuid.UUID(context.org_id),
        assessment_id,
    )
    items = []
    for row in rows:
        item = dict(row)
        options = item.get('options')
        item['options'] = json.loads(options) if isinstance(options, str) else options
        items.append(item)
    return items


@router.post('/assessments/{assessment_id}/questions', response_model=AssessmentQuestionOut, status_code=status.HTTP_201_CREATED)
async def create_assessment_question(
    assessment_id: str,
    body: AssessmentQuestionIn,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    _require_admin(context)
    row = await db.fetchrow(
        """INSERT INTO assessment_questions
               (id, org_id, assessment_id, question_index, question_text,
                response_type, options, reverse_scored)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
           ON CONFLICT (org_id, assessment_id, question_index)
           DO UPDATE SET question_text=EXCLUDED.question_text,
                         response_type=EXCLUDED.response_type,
                         options=EXCLUDED.options
           RETURNING id, assessment_id, question_index, question_text, response_type, options""",
        uuid.uuid4(),
        uuid.UUID(context.org_id),
        assessment_id,
        body.question_index,
        body.question_text,
        body.response_type,
        json.dumps(body.options) if body.options else None,
        body.reverse_scored,
    )
    item = dict(row)
    options = item.get('options')
    item['options'] = json.loads(options) if isinstance(options, str) else options
    return item
