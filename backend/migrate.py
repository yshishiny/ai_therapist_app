"""
migrate.py — the only supported way to change this database's schema
--------------------------------------------------------------------
Replaces the previous arrangement, in which seventeen migration_*.sql files
sat loose in backend/ and were applied by nothing at all, while the one
"runner" in the repo dropped every table in the public schema and replayed
schema.sql plus a single migration. Its comment read "DB currently has no
real data" -- true when written, false for a long time since. Nobody could
say what any environment's schema actually was.

How it works
    backend/schema.sql          the baseline, applied ONLY to an empty database
    backend/migrations/NNN_*.sql  ordered, applied once each, never re-run

Every applied file is recorded in `schema_migrations` with a checksum, so
editing a migration after it has run is detected instead of silently
diverging. Each migration runs in its own transaction: a failure rolls that
file back and stops, rather than leaving the schema half-changed.

Nothing here drops data. There is no reset command on purpose.

Usage
    python backend/migrate.py --status     what is applied, what is pending
    python backend/migrate.py --apply      apply everything pending
    python backend/migrate.py --baseline   record all as applied WITHOUT
                                           running them (for a database that
                                           already had them applied by hand)

Connection: DATABASE_URL, or DATABASE_HOST + DB_PASSWORD (+ optional
DB_USER, DB_NAME) matching the other scripts in this directory.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import pathlib
import sys

import asyncpg

HERE = pathlib.Path(__file__).parent
MIGRATIONS_DIR = HERE / "migrations"
SCHEMA_FILE = HERE / "schema.sql"

LEDGER_DDL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename    TEXT PRIMARY KEY,
    checksum    TEXT NOT NULL,
    applied_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
)
"""


def checksum(text: str) -> str:
    # Normalise line endings so a Windows checkout does not appear to differ
    # from a Linux one.
    return hashlib.sha256(text.replace("\r\n", "\n").encode("utf-8")).hexdigest()[:16]


def discover() -> list[tuple[str, str, str]]:
    """(filename, sql, checksum) for every migration, in filename order."""
    out = []
    for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
        sql = path.read_text(encoding="utf-8")
        out.append((path.name, sql, checksum(sql)))
    return out


async def connect() -> asyncpg.Connection:
    url = os.getenv("DATABASE_URL")
    if url:
        return await asyncpg.connect(url)
    host = os.getenv("DATABASE_HOST")
    password = os.getenv("DB_PASSWORD")
    if not host or not password:
        print("Set DATABASE_URL, or DATABASE_HOST and DB_PASSWORD.")
        sys.exit(1)
    return await asyncpg.connect(
        host=host,
        password=password,
        user=os.getenv("DB_USER", "appuser"),
        database=os.getenv("DB_NAME", "ai_therapist"),
        ssl="require",
    )


async def database_is_empty(conn: asyncpg.Connection) -> bool:
    """Whether this database still needs the schema.sql baseline.

    The ledger table itself does not count: it is created before we get here,
    so counting it would make a brand-new database look already-provisioned
    and skip the baseline -- which then fails on the first migration with
    "relation ... does not exist".
    """
    n = await conn.fetchval(
        "SELECT count(*) FROM pg_tables "
        "WHERE schemaname = 'public' AND tablename <> 'schema_migrations'"
    )
    return n == 0


async def main() -> None:
    mode = next((a for a in sys.argv[1:] if a.startswith("--")), "--status")
    if mode not in ("--status", "--apply", "--baseline"):
        print(__doc__)
        sys.exit(1)

    migrations = discover()
    if not migrations:
        print(f"No migrations found in {MIGRATIONS_DIR}")
        return

    conn = await connect()
    await conn.execute(LEDGER_DDL)

    applied = {
        r["filename"]: r["checksum"]
        for r in await conn.fetch("SELECT filename, checksum FROM schema_migrations")
    }

    pending = [(n, s, c) for (n, s, c) in migrations if n not in applied]
    drifted = [
        (n, applied[n], c) for (n, _s, c) in migrations if n in applied and applied[n] != c
    ]

    print(f"database : {os.getenv('DATABASE_HOST') or 'DATABASE_URL'}")
    print(f"migrations directory: {MIGRATIONS_DIR}")
    print(f"applied  : {len(applied)}")
    print(f"pending  : {len(pending)}")

    if drifted:
        print("\nCHANGED SINCE APPLIED — these files were edited after running:")
        for name, was, now in drifted:
            print(f"   {name}  ledger={was} file={now}")
        print("   A migration is a historical record. Add a new one instead of")
        print("   editing an applied file; the change will NOT be re-applied.")

    if mode == "--status":
        if pending:
            print("\npending:")
            for name, _sql, _c in pending:
                print(f"   {name}")
        else:
            print("\nup to date.")
        await conn.close()
        return

    if mode == "--baseline":
        # For a database that already has these changes applied by hand.
        # Records them as done WITHOUT executing any SQL.
        for name, _sql, csum in pending:
            await conn.execute(
                "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2) "
                "ON CONFLICT (filename) DO NOTHING",
                name,
                csum,
            )
        print(f"\nbaselined {len(pending)} migration(s) as already applied. No SQL was run.")
        await conn.close()
        return

    # --apply
    if await database_is_empty(conn):
        print("\nEmpty database — applying schema.sql baseline first.")
        await conn.execute(SCHEMA_FILE.read_text(encoding="utf-8"))
        print("   schema.sql applied.")

    if not pending:
        print("\nnothing to apply.")
        await conn.close()
        return

    print()
    for name, sql, csum in pending:
        print(f"applying {name} …", end=" ", flush=True)
        try:
            # One transaction per migration: a failure leaves that file's
            # changes rolled back rather than half-applied.
            async with conn.transaction():
                await conn.execute(sql)
                await conn.execute(
                    "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
                    name,
                    csum,
                )
            print("ok")
        except Exception as exc:
            print("FAILED")
            print(f"\n{name} failed and was rolled back:\n   {exc}")
            print("Nothing after this file was applied.")
            await conn.close()
            sys.exit(1)

    print(f"\napplied {len(pending)} migration(s).")
    await conn.close()


asyncio.run(main())
