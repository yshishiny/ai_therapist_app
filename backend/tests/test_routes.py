# test_routes.py — Integration tests for FastAPI routes in app.py
#
# Uses httpx.AsyncClient against the real FastAPI `app` object,
# with a mocked asyncpg pool so no real Postgres is needed.
#
# Coverage:
#   - /health (public)
#   - /auth/login
#   - /auth/refresh
#   - GET /patients               (IDOR scope + auth guard)
#   - GET /patients/{id}          (IDOR scope + auth guard)
#   - DELETE /patients/{id}       (RBAC: ADMIN/SUPERVISOR only)
#   - GET /patients/{id}/assessments (IDOR scope)

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

# helpers.py is importable (unlike conftest.py which pytest auto-loads)
from tests.helpers import (
    CLINICIAN_ID, ORG_ID, PATIENT_ID, OTHER_ORG_ID,
    make_patient_row, make_db_pool,
)
from auth import Role, create_token_pair, hash_password
from app import app


# ─── Token helpers ────────────────────────────────────────────────────────────

def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def clinician_token() -> str:
    return create_token_pair(CLINICIAN_ID, Role.CLINICIAN, ORG_ID).access_token


def admin_token() -> str:
    return create_token_pair(CLINICIAN_ID, Role.ADMIN, ORG_ID).access_token


async def _make_client(db_pool=None) -> AsyncClient:
    if db_pool is not None:
        app.state.db = db_pool
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ─── /health ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_endpoint():
    async with await _make_client() as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ─── /auth/login ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success():
    """Valid credentials return an access + refresh token pair."""
    row = make_patient_row(patient_id=CLINICIAN_ID, password="correct_password")
    pool = make_db_pool(fetchrow_return=row)
    async with await _make_client(pool) as client:
        resp = await client.post(
            "/auth/login",
            json={"email": "dr@example.com", "password": "correct_password"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password():
    """Wrong password → 401 with generic message (prevents user enumeration)."""
    row = make_patient_row(patient_id=CLINICIAN_ID, password="correct")
    pool = make_db_pool(fetchrow_return=row)
    async with await _make_client(pool) as client:
        resp = await client.post(
            "/auth/login",
            json={"email": "dr@example.com", "password": "WRONG"},
        )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid credentials."


@pytest.mark.asyncio
async def test_login_unknown_user():
    """Unknown email returns 401 — same message as wrong password."""
    pool = make_db_pool(fetchrow_return=None)
    async with await _make_client(pool) as client:
        resp = await client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": "anything"},
        )
    assert resp.status_code == 401


# ─── /auth/refresh ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_success():
    """Valid refresh token + active user → new token pair."""
    refresh_token = create_token_pair(CLINICIAN_ID, Role.CLINICIAN, ORG_ID).refresh_token
    row = make_patient_row(patient_id=CLINICIAN_ID)
    pool = make_db_pool(fetchrow_return=row)
    async with await _make_client(pool) as client:
        resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_refresh_deactivated_user():
    """Valid refresh token but user deactivated → 401."""
    refresh_token = create_token_pair(CLINICIAN_ID, Role.CLINICIAN, ORG_ID).refresh_token
    pool = make_db_pool(fetchrow_return=None)
    async with await _make_client(pool) as client:
        resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_with_access_token_rejected():
    """Passing an access token to /auth/refresh must be rejected (wrong type)."""
    pool = make_db_pool()
    async with await _make_client(pool) as client:
        resp = await client.post(
            "/auth/refresh", json={"refresh_token": clinician_token()}
        )
    assert resp.status_code == 401


# ─── GET /patients ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_patients_requires_auth():
    """No auth header → 403 (HTTPBearer raises 403 when no token is provided)."""
    async with await _make_client() as client:
        resp = await client.get("/patients")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_patients_returns_org_scoped_results():
    """DB fetch is called with the org_id from the JWT — not from request params."""
    pool = make_db_pool(fetch_return=[])
    async with await _make_client(pool) as client:
        resp = await client.get("/patients", headers=auth_headers(clinician_token()))
    assert resp.status_code == 200
    # IDOR check: the org_id from the JWT was passed to the DB query
    call_args = pool.fetch.call_args
    assert str(uuid.UUID(ORG_ID)) in str(call_args)


@pytest.mark.asyncio
async def test_invalid_token_rejected_on_patients():
    async with await _make_client() as client:
        resp = await client.get(
            "/patients", headers={"Authorization": "Bearer not.valid.jwt"}
        )
    assert resp.status_code == 401


# ─── GET /patients/{id} ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_patient_idor_blocked():
    """
    IDOR test: even if a patient UUID is guessed, if it belongs to another
    org the DB returns None because the WHERE clause includes org_id from JWT.
    The route must respond 404 (not 200 leaking cross-org data).
    """
    pool = make_db_pool(fetchrow_return=None)
    async with await _make_client(pool) as client:
        resp = await client.get(
            f"/patients/{PATIENT_ID}",
            headers=auth_headers(clinician_token()),
        )
    assert resp.status_code == 404
    # Confirm the DB was queried with the JWT's org_id (not None or different org)
    call_args = pool.fetchrow.call_args
    assert str(uuid.UUID(ORG_ID)) in str(call_args)


@pytest.mark.asyncio
async def test_get_patient_not_found():
    """Valid org, unknown patient UUID → 404."""
    pool = make_db_pool(fetchrow_return=None)
    async with await _make_client(pool) as client:
        resp = await client.get(
            f"/patients/{uuid.uuid4()}",
            headers=auth_headers(clinician_token()),
        )
    assert resp.status_code == 404


# ─── DELETE /patients/{id} ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_patient_requires_admin_or_supervisor():
    """CLINICIAN role → 403 Forbidden — only ADMIN or SUPERVISOR may delete."""
    pool = make_db_pool(execute_return="DELETE 1")
    async with await _make_client(pool) as client:
        resp = await client.delete(
            f"/patients/{PATIENT_ID}",
            headers=auth_headers(clinician_token()),
        )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_patient_admin_succeeds():
    """ADMIN role → 204 No Content."""
    pool = make_db_pool(execute_return="DELETE 1")
    async with await _make_client(pool) as client:
        resp = await client.delete(
            f"/patients/{PATIENT_ID}",
            headers=auth_headers(admin_token()),
        )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_patient_not_found():
    """ADMIN token but patient not in org → 404."""
    pool = make_db_pool(execute_return="DELETE 0")
    async with await _make_client(pool) as client:
        resp = await client.delete(
            f"/patients/{uuid.uuid4()}",
            headers=auth_headers(admin_token()),
        )
    assert resp.status_code == 404


# ─── GET /patients/{id}/assessments ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_assessments_requires_auth():
    async with await _make_client() as client:
        resp = await client.get(f"/patients/{PATIENT_ID}/assessments")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_assessments_org_scoped():
    """The JOIN in the query must use org_id from the JWT — IDOR protection."""
    pool = make_db_pool(fetch_return=[])
    async with await _make_client(pool) as client:
        resp = await client.get(
            f"/patients/{PATIENT_ID}/assessments",
            headers=auth_headers(clinician_token()),
        )
    assert resp.status_code == 200
    # Confirm org_id from JWT was passed to the DB
    call_args = pool.fetch.call_args
    assert str(uuid.UUID(ORG_ID)) in str(call_args)
