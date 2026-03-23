from fastapi import APIRouter

from backend.src.repositories.assessment_repository_db_real import AssessmentRepositoryDbReal
from backend.src.schemas.assessments import SubmitAssessmentIn
from backend.src.services.assessment_service_db import AssessmentServiceDb

router = APIRouter(prefix='/patients/{patient_id}/assessments', tags=['assessments'])


def _service(db=None) -> AssessmentServiceDb:
    return AssessmentServiceDb(repository=AssessmentRepositoryDbReal(db=db))


@router.get('')
async def list_assessments(patient_id: str, org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.list_assessments(patient_id=patient_id, org_id=org_id)


@router.post('')
async def submit_assessment(patient_id: str, body: SubmitAssessmentIn, submitted_by: str = 'migration-user', org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.submit_assessment(patient_id=patient_id, body=body, submitted_by=submitted_by, org_id=org_id)
