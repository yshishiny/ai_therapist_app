from fastapi import APIRouter

from backend.src.repositories.dashboard_repository_db_real import DashboardRepositoryDbReal
from backend.src.services.dashboard_service_db import DashboardServiceDb

router = APIRouter(prefix='/dashboard', tags=['ops'])


def _service(db=None) -> DashboardServiceDb:
    return DashboardServiceDb(repository=DashboardRepositoryDbReal(db=db))


@router.get('/summary')
async def dashboard_summary(org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.get_summary(org_id=org_id)
