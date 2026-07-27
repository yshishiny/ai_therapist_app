from fastapi import APIRouter, Depends

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_clinician_context,
    get_clinician_service,
)
from backend.src.schemas.clinicians import ClinicianOut
from backend.src.services.clinician_service_db import ClinicianServiceDb

router = APIRouter(prefix='/clinicians', tags=['clinicians'])


@router.get('', response_model=list[ClinicianOut])
async def list_clinicians(
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('patients.view'),
    service: ClinicianServiceDb = Depends(get_clinician_service),
):
    return await service.list_clinicians(org_id=context.org_id)
