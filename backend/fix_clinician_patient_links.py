"""
fix_clinician_patient_links.py — one-off data-repair script
------------------------------------------------------------
Applies migration_clinician_full_name.sql, backfills known display
names, and fixes two patients that predate proper clinician assignment:

- "Amira" lives in a stray "Default Clinic" org created 36 seconds before
  the real "AI Therapist Clinic" org (clearly bootstrap leftover, not a
  real second tenant) and has therapist_id='system'.
- "Demo" has therapist_id='unassigned'.

Both get moved into the real org and assigned to Dr. Heba, who otherwise
has zero patients despite being the primary clinical persona this app is
built around.

Usage:
    DATABASE_HOST=... python fix_clinician_patient_links.py
"""

from __future__ import annotations

import asyncio
import os

import asyncpg

REAL_ORG_ID = "40884157-aa21-49ec-9db6-0c94ca96a914"
HEBA_ID = "bec1aca8-bd34-4557-99f3-da8da029a7e8"


async def main() -> None:
    conn = await asyncpg.connect(
        user="appuser",
        password=os.environ["DB_PASSWORD"],
        database="ai_therapist",
        host=os.environ["DATABASE_HOST"],
        ssl="require",
    )

    await conn.execute("ALTER TABLE clinicians ADD COLUMN IF NOT EXISTS full_name TEXT")
    print("migration applied: clinicians.full_name")

    await conn.execute(
        "UPDATE clinicians SET full_name = $1 WHERE email = $2",
        "Dr. Heba Moustafa", "heba.moustafa5@gmail.com",
    )
    await conn.execute(
        "UPDATE clinicians SET full_name = $1 WHERE email = $2",
        "Yasser Elshishiny", "shishiny@gmail.com",
    )
    print("backfilled known display names")

    result = await conn.execute(
        """UPDATE patients
           SET org_id = $1, therapist_id = $2
           WHERE name = 'Amira' AND therapist_id = 'system'""",
        REAL_ORG_ID, HEBA_ID,
    )
    print(f"Amira: {result}")

    result = await conn.execute(
        """UPDATE patients
           SET therapist_id = $1
           WHERE name = 'Demo' AND therapist_id = 'unassigned'""",
        HEBA_ID,
    )
    print(f"Demo: {result}")

    print("=== patients after fix ===")
    for r in await conn.fetch(
        "SELECT p.id, p.name, p.therapist_id, c.email AS clinician_email, p.org_id "
        "FROM patients p LEFT JOIN clinicians c ON c.id::text = p.therapist_id "
        "ORDER BY p.name"
    ):
        print(dict(r))

    await conn.close()


asyncio.run(main())
