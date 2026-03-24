import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status

from backend.auth import CurrentUser, Role, TokenPair, create_token_pair, hash_password, revoke_token
from backend.src.core.db import DB
from backend.src.core.dependencies import get_auth_service
from backend.src.schemas.auth import LoginRequest, PatientRegisterRequest, RefreshRequest
from backend.src.services.auth_service_db import AuthServiceDb

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/register-patient', response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register_patient(body: PatientRegisterRequest, db: DB):
    existing = await db.fetchval(
        'SELECT 1 FROM patient_users WHERE email=$1',
        str(body.email),
    )
    if existing:
        raise HTTPException(status_code=409, detail='An account with this email already exists.')

    org_id = await db.fetchval('SELECT id FROM organisations LIMIT 1')
    if not org_id:
        raise HTTPException(status_code=500, detail='No organisation configured.')

    patient_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO patients (id, org_id, therapist_id, full_name, name, gender, dob, email, status, risk)
           VALUES ($1, $2, 'unassigned', $3, $4, $5, $6, $7, 'Active', 'Low')""",
        patient_id,
        org_id,
        body.full_name,
        body.full_name.split()[0],
        body.gender,
        body.dob,
        str(body.email),
    )

    patient_user_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO patient_users (id, org_id, patient_id, email, password_hash)
           VALUES ($1, $2, $3, $4, $5)""",
        patient_user_id,
        org_id,
        patient_id,
        str(body.email),
        hash_password(body.password),
    )

    return create_token_pair(
        user_id=str(patient_id),
        role=Role.PATIENT,
        org_id=str(org_id),
    )


@router.post('/login', response_model=TokenPair)
async def login(
    body: LoginRequest,
    service: AuthServiceDb = Depends(get_auth_service),
):
    return await service.login_lookup(body)


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
