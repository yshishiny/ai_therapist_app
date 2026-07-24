from fastapi import APIRouter, Depends

from auth import CurrentUser
from backend.src.schemas.auth import LoginRequest, RefreshRequest
from backend.src.services.auth_service_wired import AuthServiceWired

router = APIRouter(prefix='/auth', tags=['auth'])
service = AuthServiceWired()


@router.post('/login')
async def login(body: LoginRequest):
    """Authenticate with email and password, receive JWT tokens."""
    return await service.login(body)


@router.post('/refresh')
async def refresh(body: RefreshRequest):
    """Exchange refresh token for new access token."""
    return await service.refresh(body)


@router.post('/logout')
async def logout(user: CurrentUser = Depends()):
    """Revoke current session and logout."""
    return await service.logout(user)


@router.get('/health')
async def auth_health():
    return {'status': 'ok', 'module': 'auth', 'mode': 'wired'}
