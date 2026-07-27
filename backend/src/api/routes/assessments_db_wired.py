from fastapi import APIRouter, Depends, HTTPException, status

from backend.assessment_admin.service import list_available_templates
from backend.core.dependencies_access import require_permission
from backend.src.core.db import DB
from backend.src.core.dependencies import (
    RequestContext,
    get_assessment_service,
    get_clinician_context,
)
from backend.src.schemas.assessments import AssessmentResultOut, SubmitAssessmentIn
from backend.src.services.assessment_service_db import AssessmentServiceDb

router = APIRouter(tags=['assessments'])


async def _assert_licensed_for_patient_use(db, *, org_id: str, template_key: str) -> None:
    """Refuse to record a real patient's answers against an instrument we are
    not entitled to administer.

    RESERVED means we hold the name and nothing else. TRIAL means evaluation
    only, and a trial may permit real-patient use only when a publisher has
    authorised it -- a synthetic trial never can, because its items are
    fictional. Scoring fictional items and filing the result in a patient's
    clinical record would be worse than useless; it would be misleading.
    """
    import uuid as _uuid

    row = await db.fetchrow(
        """
        SELECT ac.name, ac.availability_state,
               t.status AS trial_status,
               t.trial_source,
               t.real_patient_use_allowed
        FROM assessment_catalog ac
        LEFT JOIN assessment_trials t
               ON t.catalog_id = ac.id AND t.org_id = ac.org_id AND t.status = 'active'
        WHERE ac.template_key = $1 AND ac.org_id = $2
        """,
        template_key,
        _uuid.UUID(org_id),
    )
    # Legacy templates have no catalog row; they predate this lifecycle and are
    # not licence-restricted, so they stay administrable.
    if row is None:
        return

    state = row["availability_state"] or "AVAILABLE"

    if state == "RESERVED":
        raise HTTPException(
            status_code=403,
            detail=(
                f"{row['name']} is reserved pending a licence and cannot be administered. "
                "Start a trial or record a licence first."
            ),
        )

    if state == "TRIAL":
        if row["trial_status"] != "active":
            raise HTTPException(
                status_code=403,
                detail=f"The trial for {row['name']} is not active, so it cannot be administered.",
            )
        if row["trial_source"] == "synthetic":
            raise HTTPException(
                status_code=403,
                detail=(
                    f"{row['name']} is running as a synthetic demonstration. Its items are "
                    "fictional and must not be administered to a real patient."
                ),
            )
        if not row["real_patient_use_allowed"]:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"The trial for {row['name']} is not authorised for real-patient use."
                ),
            )


@router.get('/patients/{patient_id}/assessments', response_model=list[AssessmentResultOut])
async def list_assessments(
    patient_id: str,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('assessments.view'),
    service: AssessmentServiceDb = Depends(get_assessment_service),
):
    return await service.list_assessments(patient_id=patient_id, org_id=context.org_id)


@router.post('/patients/{patient_id}/assessments', response_model=AssessmentResultOut, status_code=status.HTTP_201_CREATED)
async def submit_assessment(
    patient_id: str,
    body: SubmitAssessmentIn,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('assessments.assign'),
    service: AssessmentServiceDb = Depends(get_assessment_service),
):
    # Licensing gate. Trial Mode's rules previously lived only on the trial
    # administration endpoint, which nothing calls -- so THIS route, the one
    # clinicians actually use, could administer a reserved or trial-only
    # instrument to a real patient with no enforcement whatsoever.
    await _assert_licensed_for_patient_use(db, org_id=context.org_id, template_key=body.template_id)

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
    _perm=require_permission('assessments.view'),
):
    if db is None:
        return []
    return await list_available_templates(
        db,
        org_id=context.org_id,
        requesting_user_id=context.user_id,
        requesting_user_role=context.role,
    )
