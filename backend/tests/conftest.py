# conftest.py — pytest fixtures only (auto-loaded by pytest, not importable as module)
#
# Shared test data / DB mocks live in helpers.py so test files can import them.

import os

# Set env vars BEFORE any auth/app import (they read at module level)
os.environ.setdefault("JWT_SECRET_KEY", "dGVzdC1zZWNyZXQta2V5LXRoYXQtaXMtbG9uZy1lbm91Z2g=")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_TTL_MINUTES", "30")
os.environ.setdefault("REFRESH_TOKEN_TTL_DAYS", "7")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost")

# ── Imports after env vars ────────────────────────────────────────────────────
import pytest
from auth import Role, create_token_pair
from helpers import CLINICIAN_ID, ORG_ID


@pytest.fixture
def valid_access_token() -> str:
    return create_token_pair(CLINICIAN_ID, Role.CLINICIAN, ORG_ID).access_token


@pytest.fixture
def valid_refresh_token() -> str:
    return create_token_pair(CLINICIAN_ID, Role.CLINICIAN, ORG_ID).refresh_token


@pytest.fixture
def admin_access_token() -> str:
    return create_token_pair(CLINICIAN_ID, Role.ADMIN, ORG_ID).access_token
