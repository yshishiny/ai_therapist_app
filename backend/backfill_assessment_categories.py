"""
backfill_assessment_categories.py — Assign category to existing catalog entries
------------------------------------------------------------------
One-off backfill for assessment_catalog.category on rows created before
the column existed. New entries set category at creation time going
forward; this just fixes up what's already live.

Usage:
    DATABASE_URL=postgresql://... python backfill_assessment_categories.py
"""

from __future__ import annotations

import asyncio
import os

import asyncpg

CATEGORY_BY_TEMPLATE_KEY = {
    "phq9": "Depression",
    "mpi21": "Depression",
    "cdss14": "Depression",
    "bdi2": "Depression",
    "hamd": "Depression",
    "gad7": "Anxiety",
    "gad2": "Anxiety",
    "api10": "Anxiety",
    "cass13": "Anxiety",
    "bai": "Anxiety",
    "hama": "Anxiety",
    "pss10": "Stress & Burnout",
    "cbi": "Stress & Burnout",
    "mbi": "Stress & Burnout",
    "who5": "Wellbeing & Mood",
    "pcl5": "Trauma & PTSD",
    "bss": "Suicide Risk",
    "ybocs_ar": "OCD",
    "asrs_a": "ADHD",
    "mmpi2": "Personality & Clinical",
    "ei_scale_ar": "Personality & Clinical",
    "sdi7": "Sleep",
    "audit": "Substance Use",
    "dast10": "Substance Use",
    "scoff": "Eating Disorders",
    "ras": "Relationship & Social",
}


async def main() -> None:
    dsn = os.environ["DATABASE_URL"]
    conn = await asyncpg.connect(dsn=dsn)
    try:
        for key, category in CATEGORY_BY_TEMPLATE_KEY.items():
            result = await conn.execute(
                "UPDATE assessment_catalog SET category = $1 WHERE template_key = $2 AND category IS NULL",
                category, key,
            )
            print(f"  {key} -> {category}: {result}")
        # Anything else without a category (e.g. legacy or ad-hoc uploads) -> Other
        result = await conn.execute(
            "UPDATE assessment_catalog SET category = 'Other' WHERE category IS NULL"
        )
        print(f"  remaining -> Other: {result}")
    finally:
        await conn.close()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
