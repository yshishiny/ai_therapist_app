from fastapi import APIRouter

from backend.src.repositories.admin_repository_db_real import AdminRepositoryDbReal
from backend.src.services.admin_service_db import AdminServiceDb

router = APIRouter(prefix='/admin', tags=['admin'])


def _service(db=None) -> AdminServiceDb:
    return AdminServiceDb(repository=AdminRepositoryDbReal(db=db))


@router.get('/resources')
async def list_resources(org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.list_resources(org_id=org_id)


@router.get('/contacts')
async def list_contacts(org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.list_contacts(org_id=org_id)
