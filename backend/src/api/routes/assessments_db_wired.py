import json

from fastapi import APIRouter, Depends, HTTPException, status

from backend.src.core.db import DB
from backend.src.core.dependencies import (
    RequestContext,
    get_assessment_service,
    get_clinician_context,
)
from backend.src.schemas.assessments import AssessmentResultOut, SubmitAssessmentIn
from backend.src.services.assessment_service_db import AssessmentServiceDb

router = APIRouter(tags=['assessments'])


@router.get('/patients/{patient_id}/assessments', response_model=list[AssessmentResultOut])
async def list_assessments(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    service: AssessmentServiceDb = Depends(get_assessment_service),
):
    return await service.list_assessments(patient_id=patient_id, org_id=context.org_id)


@router.post('/patients/{patient_id}/assessments', response_model=AssessmentResultOut, status_code=status.HTTP_201_CREATED)
async def submit_assessment(
    patient_id: str,
    body: SubmitAssessmentIn,
    context: RequestContext = Depends(get_clinician_context),
    service: AssessmentServiceDb = Depends(get_assessment_service),
):
    result = await service.submit_assessment(
        patient_id=patient_id,
        body=body,
        submitted_by=context.user_id,
        org_id=context.org_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail='Patient not found.')
    return result


@router.get('/assessments/templates')
async def list_assessment_templates(
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    del context
    rows = await db.fetch('SELECT * FROM assessment_templates ORDER BY id')
    results = []
    for row in rows:
        item = dict(row)
        scoring_rules = item.get('scoring_rules')
        interpretation_rules = item.get('interpretation_rules')
        item['scoring_rules'] = json.loads(scoring_rules) if isinstance(scoring_rules, str) else scoring_rules
        item['interpretation_rules'] = (
            json.loads(interpretation_rules)
            if interpretation_rules and isinstance(interpretation_rules, str)
            else interpretation_rules
        )
        results.append(item)
    return results
