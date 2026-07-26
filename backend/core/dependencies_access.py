from __future__ import annotations

from typing import Annotated

import asyncpg
from fastapi import Depends, HTTPException, Request, status

from backend.access_control.service import AccessControlService
from backend.auth import CurrentUser


async def get_db(request: Request) -> asyncpg.Pool | None:
    return request.app.state.db


DB = Annotated[asyncpg.Pool, Depends(get_db)]


def require_permission(permission_key: str):
    async def _check(user: CurrentUser, db=Depends(get_db)):
        service = AccessControlService(db)
        allowed = await service.user_has_permission(
            user_id=user.sub,
            role=user.role.value,
            permission_key=permission_key,
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {permission_key}",
            )
        return user

    return Depends(_check)
