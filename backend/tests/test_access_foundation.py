import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app import app
from auth import Role, create_token_pair


ORG_ID = str(uuid.uuid4())
ADMIN_ID = str(uuid.uuid4())
PATIENT_ID = str(uuid.uuid4())
CLINICIAN_ID = str(uuid.uuid4())
GROUP_ID = str(uuid.uuid4())
ASSIGNMENT_ID = str(uuid.uuid4())


def _admin_token() -> str:
    return create_token_pair(ADMIN_ID, Role.ADMIN, ORG_ID).access_token


def _clinician_token() -> str:
    return create_token_pair(CLINICIAN_ID, Role.CLINICIAN, ORG_ID).access_token


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _make_client(db_pool) -> AsyncClient:
    app.state.db = db_pool
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


class _FakeDb:
    def __init__(self):
        self.fetch_responses = []
        self.fetchrow_responses = []
        self.fetch_calls = []
        self.fetchrow_calls = []
        self.execute_calls = []

    async def fetch(self, query, *args):
        self.fetch_calls.append((query, args))
        if self.fetch_responses:
            return self.fetch_responses.pop(0)
        return []

    async def fetchrow(self, query, *args):
        self.fetchrow_calls.append((query, args))
        if self.fetchrow_responses:
            return self.fetchrow_responses.pop(0)
        return None

    async def execute(self, query, *args):
        self.execute_calls.append((query, args))
        return "OK"


@pytest.mark.asyncio
async def test_admin_permissions_requires_admin_role():
    db = _FakeDb()
    async with await _make_client(db) as client:
        response = await client.get(
            "/admin/permissions",
            headers=_auth_headers(_clinician_token()),
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_permissions_returns_catalog():
    db = _FakeDb()
    db.fetch_responses = [[
        {
            "key": "audit.view",
            "description": "View audit events",
        }
    ]]

    async with await _make_client(db) as client:
        response = await client.get(
            "/admin/permissions",
            headers=_auth_headers(_admin_token()),
        )

    assert response.status_code == 200
    assert response.json() == [
        {"key": "audit.view", "description": "View audit events"}
    ]


@pytest.mark.asyncio
async def test_set_user_permission_override_writes_audit_event():
    db = _FakeDb()
    db.fetchrow_responses = [
        {
            "permission_key": "billing.view",
            "effect": "ALLOW",
            "created_at": "2026-03-24T10:00:00Z",
        }
    ]

    async with await _make_client(db) as client:
        response = await client.post(
            f"/admin/users/{CLINICIAN_ID}/permissions",
            headers=_auth_headers(_admin_token()),
            json={
                "permission_key": "billing.view",
                "effect": "ALLOW",
            },
        )

    assert response.status_code == 200
    assert response.json()["permission_key"] == "billing.view"
    assert len(db.execute_calls) == 1
    assert "INSERT INTO audit_log" in db.execute_calls[0][0]


@pytest.mark.asyncio
async def test_create_patient_assignment_is_org_scoped():
    db = _FakeDb()
    db.fetchrow_responses = [
        {"id": PATIENT_ID},
        {"id": CLINICIAN_ID},
        {
            "id": ASSIGNMENT_ID,
            "org_id": ORG_ID,
            "patient_id": PATIENT_ID,
            "clinician_id": CLINICIAN_ID,
            "is_primary": True,
            "status": "ACTIVE",
            "assigned_at": "2026-03-24T10:05:00Z",
            "ended_at": None,
        },
    ]

    async with await _make_client(db) as client:
        response = await client.post(
            "/admin/patient-assignments",
            headers=_auth_headers(_admin_token()),
            json={
                "patient_id": PATIENT_ID,
                "clinician_id": CLINICIAN_ID,
                "is_primary": True,
            },
        )

    assert response.status_code == 200
    assert response.json()["status"] == "ACTIVE"
    assert any("UPDATE patient_clinician_assignments" in call[0] for call in db.execute_calls)
    assert any("INSERT INTO audit_log" in call[0] for call in db.execute_calls)


@pytest.mark.asyncio
async def test_create_patient_assignment_blocks_cross_org_lookup():
    db = _FakeDb()
    db.fetchrow_responses = [None]

    async with await _make_client(db) as client:
        response = await client.post(
            "/admin/patient-assignments",
            headers=_auth_headers(_admin_token()),
            json={
                "patient_id": PATIENT_ID,
                "clinician_id": CLINICIAN_ID,
                "is_primary": True,
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Patient or clinician not found in organisation"


@pytest.mark.asyncio
async def test_get_patient_care_team_returns_assignment_rows():
    db = _FakeDb()
    db.fetch_responses = [[
        {
            "id": ASSIGNMENT_ID,
            "patient_id": PATIENT_ID,
            "clinician_id": CLINICIAN_ID,
            "is_primary": True,
            "status": "ACTIVE",
            "assigned_at": "2026-03-24T10:05:00Z",
            "ended_at": None,
            "email": "clinician@example.com",
            "role": "clinician",
        }
    ]]

    async with await _make_client(db) as client:
        response = await client.get(
            f"/admin/patients/{PATIENT_ID}/care-team",
            headers=_auth_headers(_admin_token()),
        )

    assert response.status_code == 200
    assert response.json()[0]["email"] == "clinician@example.com"


@pytest.mark.asyncio
async def test_list_audit_events_returns_org_scoped_rows():
    db = _FakeDb()
    db.fetch_responses = [[
        {
            "id": ASSIGNMENT_ID,
            "org_id": ORG_ID,
            "actor_user_id": ADMIN_ID,
            "action": "UPDATE",
            "event_type": "PATIENT_ASSIGNED_TO_CLINICIAN",
            "entity_type": "patient_clinician_assignment",
            "entity_id": PATIENT_ID,
            "metadata": {"patient_id": PATIENT_ID},
            "created_at": "2026-03-24T10:15:00Z",
        }
    ]]

    async with await _make_client(db) as client:
        response = await client.get(
            "/admin/audit",
            headers=_auth_headers(_admin_token()),
        )

    assert response.status_code == 200
    assert response.json()[0]["event_type"] == "PATIENT_ASSIGNED_TO_CLINICIAN"
    assert str(uuid.UUID(ORG_ID)) in str(db.fetch_calls[0])


@pytest.mark.asyncio
async def test_get_audit_event_returns_not_found_for_missing_row():
    db = _FakeDb()
    db.fetchrow_responses = [None]

    async with await _make_client(db) as client:
        response = await client.get(
            f"/admin/audit/{uuid.uuid4()}",
            headers=_auth_headers(_admin_token()),
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Audit event not found"


@pytest.mark.asyncio
async def test_get_audit_event_returns_row():
    db = _FakeDb()
    db.fetchrow_responses = [
        {
            "id": ASSIGNMENT_ID,
            "org_id": ORG_ID,
            "actor_user_id": ADMIN_ID,
            "action": "UPDATE",
            "event_type": "USER_PERMISSION_OVERRIDE_SET",
            "entity_type": "user_permission",
            "entity_id": CLINICIAN_ID,
            "metadata": {"permission_key": "billing.view"},
            "created_at": "2026-03-24T10:20:00Z",
        }
    ]

    async with await _make_client(db) as client:
        response = await client.get(
            f"/admin/audit/{ASSIGNMENT_ID}",
            headers=_auth_headers(_admin_token()),
        )

    assert response.status_code == 200
    assert response.json()["event_type"] == "USER_PERMISSION_OVERRIDE_SET"
