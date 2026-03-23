from fastapi import APIRouter

from backend.src.repositories.auth_repository_db_real import AuthRepositoryDbReal
from backend.src.schemas.auth import LoginRequest, RefreshRequest
from backend.src.services.auth_service_db import AuthServiceDb

router = APIRouter(prefix='/auth', tags=['auth'])


def _service(db=None) -> AuthServiceDb:
    return AuthServiceDb(repository=AuthRepositoryDbReal(db=db))


@router.post('/login')
async def login(body: LoginRequest):
    service = _service()
    return await service.login_lookup(body)


@router.post('/refresh')
async def refresh(body: RefreshRequest):
    service = _service()
    return await service.refresh_lookup(body)
