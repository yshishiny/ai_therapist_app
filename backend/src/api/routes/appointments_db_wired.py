from fastapi import APIRouter

from backend.src.repositories.appointment_repository_db_real import AppointmentRepositoryDbReal
from backend.src.services.appointment_service_db import AppointmentServiceDb

router = APIRouter(prefix='/appointments', tags=['calendar'])


def _service(db=None) -> AppointmentServiceDb:
    return AppointmentServiceDb(repository=AppointmentRepositoryDbReal(db=db))


@router.get('')
async def list_appointments(org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.list_appointments(org_id=org_id)
