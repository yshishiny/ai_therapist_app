from fastapi import APIRouter

from backend.src.schemas.auth import LoginRequest, RefreshRequest
from backend.src.services.auth_service_wired import AuthServiceWired

router = APIRouter(prefix='/auth', tags=['auth'])
service = AuthServiceWired()


@router.post('/login')
async def login(body: LoginRequest):
    return await service.login(body)


@router.post('/refresh')
async def refresh(body: RefreshRequest):
    return await service.refresh(body)


@router.get('/health')
async def auth_health():
    return {'status': 'ok', 'module': 'auth', 'mode': 'wired'}
