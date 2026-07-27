"""
repair_tenant_alignment.py — find and fix rows whose org_id disagrees with their parent
---------------------------------------------------------------------------------------
Per docs/adr/ADR-001-tenant-isolation.md.

When a patient is moved between organisations, every child row that carries its
own `org_id` keeps the OLD value and silently drops out of the practice's view.
That is exactly how three homework tasks, two sessions and a patient login came
to be stranded in an empty legacy tenant: the parent was repaired, the children
were not.

This script is the general form of that repair. It compares every table that
carries BOTH `org_id` and a parent reference against the parent's `org_id`, and
reports (or fixes) every disagreement. Run it after any tenant move, and
periodically as a drift check.

Usage:
    DATABASE_HOST=... DB_PASSWORD=... python repair_tenant_alignment.py [--fix]

Without --fix it only reports. Nothing is written unless --fix is passed.
"""

from __future__ import annotations

import asyncio
import os
import sys

import asyncpg

# (child table, parent table, FK column on child)
# Only tables that carry their own org_id are listed -- join-scoped tables
# cannot drift because they have no copy to drift from.
LINKS = [
    ("assessment_instances", "patients", "patient_id"),
    ("assessment_results", "patients", "patient_id"),
    ("homework_tasks", "patients", "patient_id"),
    ("mood_logs", "patients", "patient_id"),
    ("sessions", "patients", "patient_id"),
    ("patient_users", "patients", "patient_id"),
    ("ai_conversations", "patients", "patient_id"),
    ("material_uploads", "clinicians", "uploaded_by"),
]


async def main() -> None:
    fix = "--fix" in sys.argv

    conn = await asyncpg.connect(
        user="appuser",
        password=os.environ["DB_PASSWORD"],
        database="ai_therapist",
        host=os.environ["DATABASE_HOST"],
        ssl="require",
    )

    existing = {
        r["tablename"] for r in await conn.fetch(
            "SELECT tablename FROM pg_tables WHERE schemaname='public'"
        )
    }

    total = 0
    for child, parent, fk in LINKS:
        if child not in existing or parent not in existing:
            continue
        cols = {
            r["column_name"] for r in await conn.fetch(
                "SELECT column_name FROM information_schema.columns WHERE table_name=$1", child
            )
        }
        if "org_id" not in cols or fk not in cols:
            continue

        rows = await conn.fetch(
            f"""
            SELECT c.id, c.org_id AS child_org, p.org_id AS parent_org
            FROM {child} c
            JOIN {parent} p ON p.id = c.{fk}
            WHERE c.org_id IS DISTINCT FROM p.org_id
            """
        )
        if not rows:
            continue

        total += len(rows)
        print(f"  {child}: {len(rows)} row(s) disagree with {parent}.org_id")
        for r in rows[:5]:
            print(f"     {r['id']}  {str(r['child_org'])[:8]} -> should be {str(r['parent_org'])[:8]}")
        if len(rows) > 5:
            print(f"     … and {len(rows) - 5} more")

        if fix:
            await conn.execute(
                f"""
                UPDATE {child} c
                SET org_id = p.org_id
                FROM {parent} p
                WHERE p.id = c.{fk} AND c.org_id IS DISTINCT FROM p.org_id
                """
            )
            print(f"     fixed.")

    if total == 0:
        print("  no tenant drift found.")
    elif not fix:
        print(f"\n{total} row(s) misaligned. Re-run with --fix to correct them.")
    else:
        print(f"\nrealigned {total} row(s).")

    # Report organisations that hold no users at all -- these are the ones a
    # "pick an organisation" heuristic can wrongly select.
    print("\norganisations:")
    for r in await conn.fetch(
        """
        SELECT o.id, o.name,
               (SELECT count(*) FROM clinicians c WHERE c.org_id = o.id) AS clinicians,
               (SELECT count(*) FROM patients p WHERE p.org_id = o.id) AS patients
        FROM organisations o ORDER BY o.created_at
        """
    ):
        empty = " <-- EMPTY, should not be selectable by seed scripts" if not r["clinicians"] and not r["patients"] else ""
        print(f"   {r['name']:24} clinicians={r['clinicians']} patients={r['patients']}{empty}")

    await conn.close()


asyncio.run(main())
