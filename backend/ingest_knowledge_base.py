"""
ingest_knowledge_base.py — load the researched topic libraries into `resources`
------------------------------------------------------------------------------
The JSON libraries under backend/knowledge_base/ were sitting in the repo but
had never been loaded into the database, which is why the Content Library was
empty and why POST /assessment-recommendations returned nothing: it reads from
`resources`, and `resources` had zero rows.

Provenance is recorded per item, because the libraries were not all verified to
the same standard:

  verified    an audit agent independently re-checked a sample of the topic's
              citations against live sources (anxiety, emotional_intelligence)
  unverified  the collector wrote the file but its audit never ran, so the
              citations have NOT been independently confirmed (addiction)

That distinction is carried into the `tags` array so the UI can show it. A
clinician should not be told a reading list was checked when it was not.

Usage:
    DATABASE_HOST=... DB_PASSWORD=... python ingest_knowledge_base.py [--dry-run]
"""

from __future__ import annotations

import asyncio
import json
import os
import pathlib
import sys
import uuid

import asyncpg

BASE = pathlib.Path(__file__).parent / "knowledge_base"

# Which topic files have been through an independent citation audit.
AUDITED = {"anxiety", "emotional_intelligence"}

# Canonical topic slugs used for matching an assessment result to resources.
TOPIC_SLUG = {
    "Anxiety": "anxiety",
    "Addiction": "addiction",
    "Emotional Intelligence": "emotional_intelligence",
    "Depression": "depression",
    "PTSD": "ptsd",
    "Personality Disorders": "personality_disorders",
}


def _rows_for_topic(path: pathlib.Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    topic = data.get("topic") or path.stem
    slug = TOPIC_SLUG.get(topic, path.stem)
    provenance = "verified" if path.stem in AUDITED else "unverified"

    rows: list[dict] = []

    for b in data.get("books", []):
        rows.append(
            {
                "title": b["title"],
                "author": b.get("author"),
                "category": "BOOK",
                # Keep the clinical framing a therapist actually needs.
                "description": " ".join(
                    filter(None, [b.get("summary"), b.get("clinical_usage")])
                )[:2000],
                "file_url": None,  # no rights to host or link full text
                "tags": [slug, "book", provenance] + [str(t).lower() for t in (b.get("topics") or [])],
            }
        )

    for p in data.get("papers", []):
        rows.append(
            {
                "title": p["title"],
                "author": p.get("authors"),
                "category": "PAPER",
                "description": " ".join(
                    filter(None, [p.get("summary"), p.get("clinical_relevance")])
                )[:2000],
                "file_url": None,
                "tags": [slug, "paper", provenance]
                + ([p["source"].lower()] if p.get("source") else []),
            }
        )

    for v in data.get("videos", []):
        rows.append(
            {
                "title": v["title"],
                "author": v.get("source"),
                "category": "VIDEO",
                "description": " ".join(
                    filter(None, [v.get("description"), v.get("clinical_usage")])
                )[:2000],
                "file_url": v.get("url"),  # public YouTube links are fine to store
                "tags": [slug, "video", provenance],
            }
        )

    # Deduplicate tags while preserving order.
    for r in rows:
        seen, out = set(), []
        for t in r["tags"]:
            if t and t not in seen:
                seen.add(t)
                out.append(t)
        r["tags"] = out

    return rows


async def main() -> None:
    dry = "--dry-run" in sys.argv

    files = sorted(BASE.glob("*.json"))
    if not files:
        print(f"No topic libraries found in {BASE}")
        return

    all_rows: list[dict] = []
    for f in files:
        rows = _rows_for_topic(f)
        flag = "verified" if f.stem in AUDITED else "UNVERIFIED"
        print(f"  {f.name:32} {len(rows):3} items  [{flag}]")
        all_rows.extend(rows)

    print(f"\nTotal: {len(all_rows)} resources")
    by_cat: dict[str, int] = {}
    for r in all_rows:
        by_cat[r["category"]] = by_cat.get(r["category"], 0) + 1
    print("  by category:", by_cat)

    if dry:
        print("\n--dry-run: nothing written.")
        return

    conn = await asyncpg.connect(
        user="appuser",
        password=os.environ["DB_PASSWORD"],
        database="ai_therapist",
        host=os.environ["DATABASE_HOST"],
        ssl="require",
    )

    # Derive the org from the admin clinician, NOT from "oldest organisation".
    # This database carries a legacy empty "Default Clinic" that predates the
    # real one, so picking by created_at silently files everything into a
    # tenant that has no users -- the same trap that previously stranded two
    # patient records.
    row = await conn.fetchrow(
        """
        SELECT c.id AS uploader, c.org_id
        FROM clinicians c
        WHERE c.role = 'admin' AND c.active
        ORDER BY (SELECT count(*) FROM patients p WHERE p.org_id = c.org_id) DESC,
                 c.created_at ASC
        LIMIT 1
        """
    )
    if not row:
        print("No active admin clinician found; aborting.")
        await conn.close()
        return
    org_id, uploader = row["org_id"], row["uploader"]
    org_name = await conn.fetchval("SELECT name FROM organisations WHERE id = $1", org_id)
    print(f"\ntarget org: {org_name} ({org_id})")

    inserted = skipped = 0
    for r in all_rows:
        # Idempotent: re-running must not duplicate the library.
        exists = await conn.fetchval(
            "SELECT 1 FROM resources WHERE org_id = $1 AND title = $2 AND category = $3",
            org_id,
            r["title"],
            r["category"],
        )
        if exists:
            skipped += 1
            continue
        await conn.execute(
            """
            INSERT INTO resources
                (id, org_id, uploaded_by, title, author, category, description, file_url, tags)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
            """,
            uuid.uuid4(),
            org_id,
            uploader,
            r["title"],
            r["author"],
            r["category"],
            r["description"],
            r["file_url"],
            json.dumps(r["tags"]),
        )
        inserted += 1

    print(f"\ninserted {inserted}, skipped {skipped} (already present)")
    for row in await conn.fetch(
        "SELECT category, count(*) FROM resources WHERE org_id = $1 GROUP BY 1 ORDER BY 2 DESC",
        org_id,
    ):
        print("  ", dict(row))
    await conn.close()


asyncio.run(main())
