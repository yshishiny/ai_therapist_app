# helpers.py — Shared test data and DB mock utilities
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from auth import hash_password

# ─── Shared IDs (stable across the entire test session) ──────────────────────
CLINICIAN_ID = str(uuid.uuid4())
ORG_ID       = str(uuid.uuid4())
PATIENT_ID   = str(uuid.uuid4())
OTHER_ORG_ID = str(uuid.uuid4())


def make_patient_row(
    patient_id: str = PATIENT_ID,
    org_id: str = ORG_ID,
    name: str = "Test Patient",
    role: str = "clinician",
    password: str = "secret",
):
    """Return a mock asyncpg-record-style object."""
    row = MagicMock()
    data = {
        "id": uuid.UUID(patient_id),
        "name": name,
        "status": "Active",
        "risk": "Low",
        "diagnosis": "Test",
        "last_seen": datetime.now(timezone.utc),
        "org_id": uuid.UUID(org_id),
        "role": role,
        "password_hash": hash_password(password),
        "active": True,
    }
    row.__getitem__ = lambda self, k: data[k]
    # Support dict(row) – needed for the response serialisation in app.py
    row.keys = lambda: data.keys()
    row.__iter__ = lambda self: iter(data.items())
    return row


def make_db_pool(
    *,
    fetchrow_return=None,
    fetch_return=None,
    fetchval_return=None,
    execute_return="DELETE 1",
):
    """Build an AsyncMock asyncpg.Pool with configurable return values."""
    pool = AsyncMock()
    pool.fetchrow = AsyncMock(return_value=fetchrow_return)
    pool.fetch    = AsyncMock(return_value=fetch_return or [])
    pool.fetchval = AsyncMock(return_value=fetchval_return)
    pool.execute  = AsyncMock(return_value=execute_return)
    return pool
