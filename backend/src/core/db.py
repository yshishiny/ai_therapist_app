from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Annotated

import asyncpg
from fastapi import Depends, HTTPException, Request, status


@asynccontextmanager
async def db_lifespan(app):
    app.state.db_managed = False
    existing_db = getattr(app.state, "db", None)

    if existing_db is None:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            app.state.db = await asyncpg.create_pool(dsn=database_url)
            app.state.db_managed = True
        else:
            app.state.db = None

    try:
        yield
    finally:
        if getattr(app.state, "db_managed", False) and getattr(app.state, "db", None) is not None:
            await app.state.db.close()
            app.state.db = None


async def get_db(request: Request) -> asyncpg.Pool:
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not configured.",
        )
    return db


DB = Annotated[asyncpg.Pool, Depends(get_db)]
