# test_auth.py — Unit tests for auth.py (no database, no network)
#
# Tests cover:
#   - Password hashing and verification
#   - JWT creation (access + refresh token structure)
#   - JWT decoding: valid token, expired token, wrong type, tampered signature
#   - Role-based access checks

import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from jose import jwt

# conftest.py populates os.environ before these imports
from auth import (
    Role,
    TokenPayload,
    _decode,
    create_token_pair,
    hash_password,
    require_role,
    verify_password,
)

_SECRET = os.environ["JWT_SECRET_KEY"]
_ALG    = os.environ.get("JWT_ALGORITHM", "HS256")

UID    = str(uuid.uuid4())
ORG_ID = str(uuid.uuid4())


# ─── Password hashing ─────────────────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        assert hash_password("secret") != "secret"

    def test_verify_correct_password(self):
        hashed = hash_password("correct_horse_battery_staple")
        assert verify_password("correct_horse_battery_staple", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt salt means each hash is unique."""
        h1 = hash_password("password")
        h2 = hash_password("password")
        assert h1 != h2

    def test_each_hash_still_verifies(self):
        h1 = hash_password("password")
        h2 = hash_password("password")
        assert verify_password("password", h1)
        assert verify_password("password", h2)


# ─── Token creation ───────────────────────────────────────────────────────────

class TestCreateTokenPair:
    def test_returns_token_pair(self):
        pair = create_token_pair(UID, Role.CLINICIAN, ORG_ID)
        assert pair.access_token
        assert pair.refresh_token
        assert pair.token_type == "bearer"

    def test_access_token_claims(self):
        pair = create_token_pair(UID, Role.CLINICIAN, ORG_ID)
        raw = jwt.decode(pair.access_token, _SECRET, algorithms=[_ALG])
        assert raw["sub"]    == UID
        assert raw["role"]   == Role.CLINICIAN.value
        assert raw["org_id"] == ORG_ID
        assert raw["type"]   == "access"

    def test_refresh_token_claims(self):
        pair = create_token_pair(UID, Role.CLINICIAN, ORG_ID)
        raw = jwt.decode(pair.refresh_token, _SECRET, algorithms=[_ALG])
        assert raw["type"] == "refresh"

    def test_access_token_expires_later_than_now(self):
        pair = create_token_pair(UID, Role.CLINICIAN, ORG_ID)
        raw = jwt.decode(pair.access_token, _SECRET, algorithms=[_ALG])
        exp = datetime.fromtimestamp(raw["exp"], tz=timezone.utc)
        assert exp > datetime.now(timezone.utc)

    def test_refresh_ttl_longer_than_access_ttl(self):
        pair = create_token_pair(UID, Role.CLINICIAN, ORG_ID)
        access_raw  = jwt.decode(pair.access_token,  _SECRET, algorithms=[_ALG])
        refresh_raw = jwt.decode(pair.refresh_token, _SECRET, algorithms=[_ALG])
        assert refresh_raw["exp"] > access_raw["exp"]

    def test_all_roles_accepted(self):
        for role in Role:
            pair = create_token_pair(UID, role, ORG_ID)
            raw = jwt.decode(pair.access_token, _SECRET, algorithms=[_ALG])
            assert raw["role"] == role.value


# ─── Token decoding ───────────────────────────────────────────────────────────

class TestDecode:
    def _make_raw_token(
        self,
        *,
        token_type: str = "access",
        exp_delta: timedelta = timedelta(minutes=30),
        secret: str = _SECRET,
        extra: dict | None = None,
    ) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub":    UID,
            "role":   Role.CLINICIAN.value,
            "org_id": ORG_ID,
            "iat":    now,
            "exp":    now + exp_delta,
            "type":   token_type,
            **(extra or {}),
        }
        return jwt.encode(payload, secret, algorithm=_ALG)

    def test_valid_access_token(self):
        token = self._make_raw_token()
        payload = _decode(token, "access")
        assert isinstance(payload, TokenPayload)
        assert payload.sub == UID
        assert payload.org_id == ORG_ID

    def test_valid_refresh_token(self):
        token = self._make_raw_token(token_type="refresh")
        payload = _decode(token, "refresh")
        assert payload.type == "refresh"

    def test_expired_token_raises_401(self):
        token = self._make_raw_token(exp_delta=timedelta(seconds=-1))
        with pytest.raises(HTTPException) as exc_info:
            _decode(token, "access")
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    def test_tampered_signature_raises_401(self):
        token = self._make_raw_token(secret="wrong-secret-key-for-tampering")
        with pytest.raises(HTTPException) as exc_info:
            _decode(token, "access")
        assert exc_info.value.status_code == 401

    def test_wrong_token_type_raises_401(self):
        """Passing a refresh token where an access token is expected → 401."""
        token = self._make_raw_token(token_type="refresh")
        with pytest.raises(HTTPException) as exc_info:
            _decode(token, "access")
        assert exc_info.value.status_code == 401
        assert "access" in exc_info.value.detail.lower()

    def test_garbage_string_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            _decode("not.a.real.jwt", "access")
        assert exc_info.value.status_code == 401


# ─── require_role ─────────────────────────────────────────────────────────────

class TestRequireRole:
    """
    require_role() returns a Depends() object; we test the inner _check
    function directly by resolving it with a fake CurrentUser payload.
    """

    def _make_payload(self, role: Role) -> TokenPayload:
        now = datetime.now(timezone.utc)
        return TokenPayload(
            sub=UID,
            role=role,
            org_id=ORG_ID,
            exp=now + timedelta(minutes=30),
            iat=now,
            type="access",
        )

    def _extract_check_fn(self, *roles: Role):
        """Pull the inner _check callable out of the Depends wrapper."""
        dep = require_role(*roles)
        return dep.dependency

    def test_allowed_role_passes(self):
        check = self._extract_check_fn(Role.ADMIN, Role.SUPERVISOR)
        payload = self._make_payload(Role.ADMIN)
        result = check(user=payload)
        assert result == payload

    def test_disallowed_role_raises_403(self):
        check = self._extract_check_fn(Role.ADMIN)
        payload = self._make_payload(Role.CLINICIAN)
        with pytest.raises(HTTPException) as exc_info:
            check(user=payload)
        assert exc_info.value.status_code == 403

    def test_supervisor_allowed_when_in_list(self):
        check = self._extract_check_fn(Role.SUPERVISOR, Role.ADMIN)
        payload = self._make_payload(Role.SUPERVISOR)
        assert check(user=payload) == payload

    def test_clinician_blocked_from_admin_only(self):
        check = self._extract_check_fn(Role.ADMIN)
        payload = self._make_payload(Role.CLINICIAN)
        with pytest.raises(HTTPException) as exc_info:
            check(user=payload)
        assert exc_info.value.status_code == 403
        assert "admin" in exc_info.value.detail.lower()
