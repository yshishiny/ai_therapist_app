"""
seed_licensed_instrument_slots.py — Reserve catalog slots for licensed instruments
------------------------------------------------------------------------------
Creates catalog-only entries (no version, no item content) for commercially
licensed or restricted instruments, so they are visible in the admin catalog
as "reserved" and ready to receive real content once a license is obtained.
Deliberately creates NO assessment_versions row — there is nothing to
publish yet. Once licensed, use the existing assessment-admin API
(POST /admin/assessment-catalog/{id}/versions + publish) to upload the
real item content and mark the entry active.

Covers: BDI-II, BAI, BSS (Beck / Pearson Clinical), HAM-D, HAM-A (Hamilton),
MMPI-2 (University of Minnesota Press / Pearson, Level-C restricted),
MBI (Maslach Burnout Inventory / Mind Garden).

Usage:
    DATABASE_URL=postgresql://... SEED_ORG_ID=... SEED_ADMIN_ID=... python seed_licensed_instrument_slots.py
"""

from __future__ import annotations

import asyncio
import os
import uuid

import asyncpg

LICENSED_SLOTS = [
    {
        "template_key": "bdi2",
        "name": "BDI-II (Beck Depression Inventory-II)",
        "template_type": "LICENSED_EXTERNAL",
        "description": "Requires a commercial license from Pearson Clinical (Q-global). Upload real item content and scoring once licensed.",
    },
    {
        "template_key": "bai",
        "name": "BAI (Beck Anxiety Inventory)",
        "template_type": "LICENSED_EXTERNAL",
        "description": "Requires a commercial license from Pearson Clinical (Q-global). Upload real item content and scoring once licensed.",
    },
    {
        "template_key": "bss",
        "name": "BSS (Beck Scale for Suicide Ideation)",
        "template_type": "LICENSED_EXTERNAL",
        "description": "Requires a commercial license from Pearson Clinical (Q-global). Safety-critical instrument — pair with clinician training and risk-escalation workflows once live, not just item content.",
    },
    {
        "template_key": "hamd",
        "name": "HAM-D (Hamilton Depression Rating Scale)",
        "template_type": "LICENSED_EXTERNAL",
        "description": "Clinician-administered. Licensing terms vary by source/translation and publisher — verify current usage rights before uploading item content.",
    },
    {
        "template_key": "hama",
        "name": "HAM-A (Hamilton Anxiety Rating Scale)",
        "template_type": "LICENSED_EXTERNAL",
        "description": "Clinician-administered. Licensing terms vary by source/translation and publisher — verify current usage rights before uploading item content.",
    },
    {
        "template_key": "mmpi2",
        "name": "MMPI-2 (Minnesota Multiphasic Personality Inventory-2)",
        "template_type": "LICENSED_EXTERNAL",
        "description": "Level-C restricted instrument (University of Minnesota Press / Pearson). Requires qualified-user credentialing and is typically administered on the publisher's own platform rather than embedded in third-party software — plan to record results here, not host the instrument itself.",
    },
    {
        "template_key": "mbi",
        "name": "MBI (Maslach Burnout Inventory)",
        "template_type": "LICENSED_EXTERNAL",
        "description": "Requires a commercial license from Mind Garden. Note: the Copenhagen Burnout Inventory (already live in this catalog, template key 'cbi') covers the same burnout construct and is free to use — confirm MBI's specific norms are actually needed before licensing.",
    },
]


async def seed(conn: asyncpg.Connection, org_id: str, admin_id: str) -> None:
    for slot in LICENSED_SLOTS:
        existing = await conn.fetchrow(
            "SELECT id FROM assessment_catalog WHERE org_id = $1 AND template_key = $2",
            uuid.UUID(org_id), slot["template_key"],
        )
        if existing:
            print(f"  reserved slot already exists for {slot['template_key']}: {existing['id']}")
            continue
        catalog_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO assessment_catalog (
                id, org_id, template_key, name, template_type,
                license_status, description, is_active, created_by
            )
            VALUES ($1, $2, $3, $4, $5, 'LICENSE_REQUIRED', $6, FALSE, $7)
            """,
            catalog_id, uuid.UUID(org_id), slot["template_key"], slot["name"],
            slot["template_type"], slot["description"], uuid.UUID(admin_id),
        )
        print(f"  reserved slot created for {slot['template_key']}: {catalog_id}")


async def main() -> None:
    dsn = os.environ["DATABASE_URL"]
    org_id = os.environ["SEED_ORG_ID"]
    admin_id = os.environ["SEED_ADMIN_ID"]
    conn = await asyncpg.connect(dsn=dsn)
    try:
        await seed(conn, org_id, admin_id)
    finally:
        await conn.close()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
