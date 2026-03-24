import uuid
import json

from fastapi import APIRouter, Depends, HTTPException, status

from backend.src.core.db import DB
from backend.src.core.dependencies import (
    RequestContext,
    get_careplan_service,
    get_clinician_context,
)
from backend.src.schemas.careplans import CarePlanIn, CarePlanOut
from backend.src.services.careplan_service_db import CarePlanServiceDb

router = APIRouter(prefix='/patients/{patient_id}/careplans', tags=['careplans'])


@router.get('', response_model=list[CarePlanOut])
async def list_careplans(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    service: CarePlanServiceDb = Depends(get_careplan_service),
):
    return await service.list_careplans(patient_id=patient_id, org_id=context.org_id)


@router.post('', response_model=CarePlanOut, status_code=status.HTTP_201_CREATED)
async def create_careplan(
    patient_id: str,
    body: CarePlanIn,
    context: RequestContext = Depends(get_clinician_context),
    service: CarePlanServiceDb = Depends(get_careplan_service),
):
    result = await service.create_careplan(
        patient_id=patient_id,
        body=body,
        created_by=context.user_id,
        org_id=context.org_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail='Patient not found.')
    return result


@router.get('/active')
async def get_active_careplan(
    patient_id: str,
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

    plan = await db.fetchrow(
        "SELECT * FROM care_plans WHERE patient_id=$1 AND status='ACTIVE' ORDER BY created_at DESC LIMIT 1",
        uuid.UUID(patient_id),
    )
    if plan is None:
        plan = await db.fetchrow(
            'SELECT * FROM care_plans WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 1',
            uuid.UUID(patient_id),
        )
    if plan is None:
        raise HTTPException(status_code=404, detail='No care plan found.')

    phases = await db.fetch(
        'SELECT * FROM care_plan_phases WHERE careplan_id=$1 ORDER BY phase_index ASC',
        plan['id'],
    )

    plan_data = dict(plan)
    goals = plan_data.get('goals')
    plan_data['goals'] = json.loads(goals) if isinstance(goals, str) else goals

    phase_items = []
    for phase in phases:
        item = dict(phase)
        for key in ('methods', 'homework_templates', 'measures_to_track'):
            value = item.get(key)
            item[key] = json.loads(value) if isinstance(value, str) else value
        phase_items.append(item)

    plan_data['phases'] = phase_items
    return plan_data
