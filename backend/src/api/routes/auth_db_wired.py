from fastapi import APIRouter, Depends, Response, status

from backend.auth import CurrentUser, TokenPair, revoke_token
from backend.src.core.dependencies import get_auth_service
from backend.src.schemas.auth import GoogleLoginRequest, LoginRequest, PatientRegisterRequest, RefreshRequest
from backend.src.services.auth_service_db import AuthServiceDb

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/register-patient', response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register_patient(
    body: PatientRegisterRequest,
    service: AuthServiceDb = Depends(get_auth_service),
):
    return await service.register_patient(body)


@router.post('/login', response_model=TokenPair)
async def login(
    body: LoginRequest,
    service: AuthServiceDb = Depends(get_auth_service),
):
    return await service.login_lookup(body)


@router.post('/google', response_model=TokenPair)
async def login_with_google(
    body: GoogleLoginRequest,
    service: AuthServiceDb = Depends(get_auth_service),
):
    return await service.login_with_google(body.id_token)


@router.post('/refresh', response_model=TokenPair)
async def refresh(
    body: RefreshRequest,
    service: AuthServiceDb = Depends(get_auth_service),
):
    return await service.refresh_lookup(body)


@router.post('/logout', status_code=status.HTTP_204_NO_CONTENT)
async def logout(user: CurrentUser):
    revoke_token(user.jti)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
