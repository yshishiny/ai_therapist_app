"""
auth.py — JWT authentication for AI Therapist API
--------------------------------------------------
Provides:
  - Password hashing (bcrypt via passlib)
  - JWT access + refresh token creation / verification
  - FastAPI dependency  `get_current_user`  for protected routes
  - FastAPI dependency  `require_role`       for role-based access

Environment variables required (never hard-code these):
  JWT_SECRET_KEY   — at least 32 random bytes, base64-encoded
  JWT_ALGORITHM    — default HS256
  ACCESS_TOKEN_TTL_MINUTES  — default 30
  REFRESH_TOKEN_TTL_DAYS    — default 7

Generate a safe secret:
  python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(48)).decode())"
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field

# ─── Config (pulled from environment) ────────────────────────────────────────

_SECRET_KEY: str = os.environ["JWT_SECRET_KEY"]          # required — no default
_ALGORITHM: str  = os.getenv("JWT_ALGORITHM", "HS256")
_ACCESS_TTL  = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "30"))
_REFRESH_TTL = int(os.getenv("REFRESH_TOKEN_TTL_DAYS",   "7"))

# ─── Password hashing ─────────────────────────────────────────────────────────

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


# ─── Role model ───────────────────────────────────────────────────────────────

class Role(str, Enum):
    PATIENT = "patient"
    CLINICIAN = "clinician"
    SUPERVISOR = "supervisor"
    ADMIN = "admin"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            normalized = value.lower()
            for member in cls:
                if member.value == normalized:
                    return member
        return None


# ─── Token payload ────────────────────────────────────────────────────────────

class TokenPayload(BaseModel):
    sub: str           # user id (UUID string)
    role: Role
    org_id: str        # tenant / organisation id for multi-tenancy checks
    exp: datetime
    iat: datetime
    type: str          # "access" | "refresh"
    jti: str = Field(default_factory=lambda: str(uuid.uuid4()))  # unique token ID — used for revocation


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ─── Token creation ───────────────────────────────────────────────────────────

# ─── Token revocation denylist ────────────────────────────────────────────────
#
# In-memory set of revoked JTIs. Sufficient for a single Railway instance.
# On restart the set is empty — revoked tokens expire naturally within TTL.
# Upgrade path: back this with Redis or a DB table for multi-instance deploys.

_revoked_jtis: set[str] = set()


def revoke_token(jti: str) -> None:
    """Add a token JTI to the in-memory denylist."""
    _revoked_jtis.add(jti)


def _make_token(
    user_id: str,
    role: Role,
    org_id: str,
    ttl: timedelta,
    token_type: str,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub":    user_id,
        "role":   role.value,
        "org_id": org_id,
        "iat":    now,
        "exp":    now + ttl,
        "type":   token_type,
        "jti":    str(uuid.uuid4()),
    }
    return jwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)


def create_token_pair(user_id: str, role: Role, org_id: str) -> TokenPair:
    return TokenPair(
        access_token=_make_token(
            user_id, role, org_id,
            timedelta(minutes=_ACCESS_TTL),
            "access",
        ),
        refresh_token=_make_token(
            user_id, role, org_id,
            timedelta(days=_REFRESH_TTL),
            "refresh",
        ),
    )


# ─── Token verification ───────────────────────────────────────────────────────

def _decode(token: str, expected_type: str) -> TokenPayload:
    """Decode and validate a JWT. Raises HTTPException on any failure."""
    try:
        raw = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if raw.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected a {expected_type} token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jti = raw.get("jti", "")
    if jti in _revoked_jtis:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return TokenPayload(**raw)


# ─── FastAPI bearer extraction ────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(_bearer)],
) -> TokenPayload:
    """
    Dependency: validates the Authorization: Bearer <access_token> header.
    Inject into any route that requires authentication.

    Usage:
        @router.get("/patients")
        async def list_patients(user: CurrentUser):
            ...
    """
    return _decode(credentials.credentials, "access")


# Type alias for cleaner route signatures
CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]


def require_role(*allowed: Role):
    """
    Dependency factory for role-based access control.

    Usage:
        @router.delete("/patients/{id}")
        async def delete_patient(
            patient_id: str,
            user: Annotated[TokenPayload, Depends(require_role(Role.ADMIN, Role.SUPERVISOR))],
        ):
            ...
    """
    def _check(user: CurrentUser) -> TokenPayload:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"This action requires one of: "
                    f"{', '.join(r.value for r in allowed)}."
                ),
            )
        return user
    return Depends(_check)
