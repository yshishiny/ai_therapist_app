from fastapi import APIRouter

from backend.src.schemas.auth import LoginRequest, RefreshRequest

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/login')
async def login(body: LoginRequest):
    return {
        'status': 'db-route-scaffold',
        'module': 'auth',
        'action': 'login',
        'email': str(body.email),
    }


@router.post('/refresh')
async def refresh(body: RefreshRequest):
    return {
        'status': 'db-route-scaffold',
        'module': 'auth',
        'action': 'refresh',
        'refresh_token_present': bool(body.refresh_token),
    }
