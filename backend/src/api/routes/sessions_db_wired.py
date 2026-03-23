from fastapi import APIRouter

from backend.src.repositories.session_repository_db_real import SessionRepositoryDbReal
from backend.src.schemas.sessions import SessionNoteIn
from backend.src.services.session_service_db import SessionServiceDb

router = APIRouter(prefix='/patients/{patient_id}/sessions', tags=['sessions'])


def _service(db=None) -> SessionServiceDb:
    return SessionServiceDb(repository=SessionRepositoryDbReal(db=db))


@router.get('')
async def list_sessions(patient_id: str, org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.list_sessions(patient_id=patient_id, org_id=org_id)


@router.post('')
async def create_session(patient_id: str, body: SessionNoteIn, org_id: str = '00000000-0000-0000-0000-000000000000'):
    service = _service()
    return await service.create_session(patient_id=patient_id, body=body, org_id=org_id)
