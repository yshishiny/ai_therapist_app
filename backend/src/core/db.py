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
            # db-f1-micro caps max_connections at 25; asyncpg's default
            # pool size (10) is enough on its own to exhaust that across
            # even two overlapping instances (e.g. mid-deploy). Keep pools
            # small -- this app's real concurrency needs are modest.
            app.state.db = await asyncpg.create_pool(
                dsn=database_url,
                min_size=int(os.getenv("DB_POOL_MIN_SIZE", "1")),
                max_size=int(os.getenv("DB_POOL_MAX_SIZE", "4")),
            )
            app.state.db_managed = True
        else:
            app.state.db = None

    try:
        yield
    finally:
        if getattr(app.state, "db_managed", False) and getattr(app.state, "db", None) is not None:
            await app.state.db.close()
            app.state.db = None


async def get_db(request: Request) -> asyncpg.Pool | None:
    db = getattr(request.app.state, "db", None)
    return db


DB = Annotated[asyncpg.Pool | None, Depends(get_db)]
