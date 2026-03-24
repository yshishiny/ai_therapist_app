import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from backend.app import app
from backend.auth import Role, create_token_pair, hash_password

ORG_ID = str(uuid.uuid4())
CLINICIAN_ID = str(uuid.uuid4())
PATIENT_ID = str(uuid.uuid4())


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def clinician_token() -> str:
    return create_token_pair(CLINICIAN_ID, Role.CLINICIAN, ORG_ID).access_token


def patient_token() -> str:
    return create_token_pair(PATIENT_ID, Role.PATIENT, ORG_ID).access_token


def make_db_pool() -> MagicMock:
    pool = MagicMock()
    pool.fetch = AsyncMock(return_value=[])
    pool.fetchrow = AsyncMock(return_value=None)
    pool.fetchval = AsyncMock(return_value=None)
    pool.execute = AsyncMock(return_value="UPDATE 1")
    return pool


async def make_client(db_pool: MagicMock | None = None) -> AsyncClient:
    if db_pool is not None:
        app.state.db = db_pool
        app.state.db_managed = False
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_health_endpoint():
    async with await make_client() as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_returns_real_token_pair():
    pool = make_db_pool()
    pool.fetchrow.side_effect = [
        {
            "id": CLINICIAN_ID,
            "org_id": ORG_ID,
            "role": "clinician",
            "password_hash": hash_password("correct-password"),
        },
    ]

    async with await make_client(pool) as client:
        response = await client.post(
            "/auth/login",
            json={"email": "dr@example.com", "password": "correct-password"},
        )

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_list_patients_requires_auth():
    async with await make_client() as client:
        response = await client.get("/patients")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_patients_uses_org_from_jwt_context():
    pool = make_db_pool()

    async with await make_client(pool) as client:
        response = await client.get("/patients", headers=auth_headers(clinician_token()))

    assert response.status_code == 200
    call_args = pool.fetch.call_args
    assert str(uuid.UUID(ORG_ID)) in str(call_args)


@pytest.mark.asyncio
async def test_patient_portal_profile_uses_patient_context_from_jwt():
    pool = make_db_pool()
    pool.fetchrow.return_value = {
        "id": PATIENT_ID,
        "full_name": "Amira Hassan",
        "gender": "Female",
        "dob": None,
        "primary_diagnosis": "Generalised Anxiety",
        "diagnosis": "Generalised Anxiety",
        "status": "Active",
        "risk_level": "Low",
        "risk": "Low",
        "therapist_id": CLINICIAN_ID,
    }

    async with await make_client(pool) as client:
        response = await client.get("/me/profile", headers=auth_headers(patient_token()))

    assert response.status_code == 200
    assert response.json()["id"] == PATIENT_ID
    call_args = pool.fetchrow.call_args
    assert str(uuid.UUID(PATIENT_ID)) in str(call_args)
    assert str(uuid.UUID(ORG_ID)) in str(call_args)
