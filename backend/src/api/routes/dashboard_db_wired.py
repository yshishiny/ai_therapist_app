from fastapi import APIRouter, Depends

from backend.core.dependencies_access import require_permission
from backend.src.core.dependencies import (
    RequestContext,
    get_clinician_context,
    get_dashboard_service,
)
from backend.src.schemas.dashboard import ClinicianDashboardOut, DashboardSummaryOut
from backend.src.services.dashboard_service_db import DashboardServiceDb

router = APIRouter(prefix='/dashboard', tags=['ops'])


@router.get('/summary', response_model=DashboardSummaryOut)
async def dashboard_summary(
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('dashboard.view'),
    service: DashboardServiceDb = Depends(get_dashboard_service),
):
    return await service.get_summary(org_id=context.org_id)


@router.get('/clinician-summary', response_model=ClinicianDashboardOut)
async def clinician_dashboard_summary(
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('dashboard.view'),
    service: DashboardServiceDb = Depends(get_dashboard_service),
):
    """The logged-in clinician's own caseload snapshot (as opposed to
    /dashboard/summary, which is practice-wide)."""
    return await service.get_clinician_summary(org_id=context.org_id, therapist_id=context.user_id)
