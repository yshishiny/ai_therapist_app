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

_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "local-dev-secret-change-me-before-production-please",
)
_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
_ACCESS_TTL = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "30"))
_REFRESH_TTL = int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "7"))

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=True)
_revoked_jtis: set[str] = set()


class Role(str, Enum):
    PATIENT = "patient"
    CLINICIAN = "clinician"
    SUPERVISOR = "supervisor"
    ADMIN = "admin"


class TokenPayload(BaseModel):
    sub: str
    role: Role
    org_id: str
    exp: datetime
    iat: datetime
    type: str
    jti: str = Field(default_factory=lambda: str(uuid.uuid4()))


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def hash_password(plain: str) -> str:
    return _pwd_ctx.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_ctx.verify(plain, hashed)


def revoke_token(jti: str) -> None:
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
        "sub": user_id,
        "role": role.value,
        "org_id": org_id,
        "iat": now,
        "exp": now + ttl,
        "type": token_type,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)


def create_token_pair(user_id: str, role: Role, org_id: str) -> TokenPair:
    return TokenPair(
        access_token=_make_token(
            user_id=user_id,
            role=role,
            org_id=org_id,
            ttl=timedelta(minutes=_ACCESS_TTL),
            token_type="access",
        ),
        refresh_token=_make_token(
            user_id=user_id,
            role=role,
            org_id=org_id,
            ttl=timedelta(days=_REFRESH_TTL),
            token_type="refresh",
        ),
    )


def _decode(token: str, expected_type: str) -> TokenPayload:
    try:
        raw = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

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


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(_bearer)],
) -> TokenPayload:
    return _decode(credentials.credentials, "access")


CurrentUser = Annotated[TokenPayload, Depends(get_current_user)]
