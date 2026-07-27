"""
backfill_catalog_arabic_names.py — Arabic titles/category labels for the catalog
--------------------------------------------------------------------------------
One-off backfill for assessment_catalog.name_ar and category_ar on rows created
before the columns existed (see migration_assessment_catalog_bilingual.sql).
This translates catalog TITLES and CATEGORY LABELS only — question content
inside definition_json is already bilingual (text/text_ar) and is not touched.

Well-known instruments get their established Arabic names, keeping the Latin
acronym where that's conventional. Idempotent: plain UPDATEs keyed by
template_key — keys not present in the catalog are simply no-ops, and re-runs
rewrite the same values.

Usage (either env-var style works):
    DATABASE_URL=postgresql://... python backfill_catalog_arabic_names.py
    DATABASE_HOST=... DB_PASSWORD=... python backfill_catalog_arabic_names.py
"""

from __future__ import annotations

import asyncio
import os
import sys

import asyncpg

# template_key -> established Arabic title (acronym kept in Latin script).
NAME_AR_BY_TEMPLATE_KEY = {
    # Depression
    "phq9": "استبيان صحة المريض - 9 (PHQ-9)",
    "mpi21": "قائمة أنماط المزاج (MPI-21)",
    "cdss14": "مقياس شدة الاكتئاب بتقييم المعالج (CDSS-14)",
    "bdi2": "قائمة بيك للاكتئاب - الإصدار الثاني (BDI-II)",
    "hamd": "مقياس هاملتون لتقييم الاكتئاب (HAM-D)",
    # Anxiety
    "gad7": "مقياس القلق العام - 7 (GAD-7)",
    "gad2": "مقياس القلق العام - 2 (GAD-2)",
    "api10": "قائمة أنماط القلق (API-10)",
    "cass13": "مقياس شدة القلق بتقييم المعالج (CASS-13)",
    "bai": "قائمة بيك للقلق (BAI)",
    "hama": "مقياس هاملتون لتقييم القلق (HAM-A)",
    # Stress & Burnout
    "pss10": "مقياس الضغط النفسي المدرك (PSS-10)",
    "cbi": "مقياس كوبنهاغن للاحتراق النفسي (CBI)",
    "mbi": "مقياس ماسلاك للاحتراق النفسي (MBI)",
    # Wellbeing & Mood
    "who5": "مؤشر منظمة الصحة العالمية للرفاه - 5 (WHO-5)",
    # Trauma & PTSD
    "pcl5": "قائمة اضطراب ما بعد الصدمة - 5 (PCL-5)",
    # Suicide Risk
    "bss": "مقياس بيك للأفكار الانتحارية (BSS)",
    # OCD
    "ybocs_ar": "مقياس ييل براون للوسواس القهري (Y-BOCS)",
    # ADHD
    "asrs_a": "مقياس التقرير الذاتي لاضطراب فرط الحركة وتشتت الانتباه لدى البالغين (ASRS v1.1) - الجزء أ",
    # Personality & Clinical
    "mmpi2": "اختبار مينيسوتا متعدد الأوجه للشخصية - 2 (MMPI-2)",
    "ei_scale_ar": "مقياس الذكاء العاطفي",
    # Sleep
    "sdi7": "مؤشر صعوبات النوم (SDI-7)",
    # Substance Use
    "audit": "اختبار تحديد اضطرابات استخدام الكحول (AUDIT)",
    "dast10": "اختبار فحص تعاطي المخدرات - 10 (DAST-10)",
    # Eating Disorders
    "scoff": "استبيان سكوف لاضطرابات الأكل (SCOFF)",
    # Relationship & Social
    "ras": "مقياس تقييم العلاقة (RAS)",
}

# English category label -> Arabic category label. Covers every distinct
# category value assigned by backfill_assessment_categories.py, plus 'Other'.
CATEGORY_AR_BY_CATEGORY = {
    "Depression": "الاكتئاب",
    "Anxiety": "القلق",
    "Stress & Burnout": "الضغط النفسي والاحتراق المهني",
    "Wellbeing & Mood": "الرفاه والمزاج",
    "Trauma & PTSD": "الصدمات واضطراب ما بعد الصدمة",
    "Suicide Risk": "خطر الانتحار",
    "OCD": "الوسواس القهري",
    "ADHD": "اضطراب فرط الحركة وتشتت الانتباه",
    "Personality & Clinical": "الشخصية والمقاييس الإكلينيكية",
    "Sleep": "النوم",
    "Substance Use": "اضطرابات استخدام المواد",
    "Eating Disorders": "اضطرابات الأكل",
    "Relationship & Social": "العلاقات والجوانب الاجتماعية",
    "Other": "أخرى",
}


async def _connect() -> asyncpg.Connection:
    dsn = os.environ.get("DATABASE_URL")
    if dsn:
        return await asyncpg.connect(dsn=dsn)
    return await asyncpg.connect(
        user="appuser",
        password=os.environ["DB_PASSWORD"],
        database="ai_therapist",
        host=os.environ["DATABASE_HOST"],
        ssl="require",
    )


async def main() -> None:
    # Arabic output on a legacy Windows console codepage would otherwise crash print().
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    conn = await _connect()
    try:
        print("Backfilling name_ar by template_key (org-wide):")
        for key, name_ar in NAME_AR_BY_TEMPLATE_KEY.items():
            result = await conn.execute(
                "UPDATE assessment_catalog SET name_ar = $1 WHERE template_key = $2",
                name_ar, key,
            )
            print(f"  {key} -> {name_ar}: {result}")

        print("Backfilling category_ar by category label (org-wide):")
        for category, category_ar in CATEGORY_AR_BY_CATEGORY.items():
            result = await conn.execute(
                "UPDATE assessment_catalog SET category_ar = $1 WHERE category = $2",
                category_ar, category,
            )
            print(f"  {category} -> {category_ar}: {result}")

        missing_names = await conn.fetch(
            """
            SELECT template_key, name, category
            FROM assessment_catalog
            WHERE name_ar IS NULL
            ORDER BY template_key
            """
        )
        if missing_names:
            print("Catalog rows still without name_ar (e.g. ad-hoc/custom uploads):")
            for row in missing_names:
                print(f"  {row['template_key']}: {row['name']} (category: {row['category']})")
        else:
            print("All catalog rows have name_ar.")

        missing_categories = await conn.fetch(
            """
            SELECT template_key, name, category
            FROM assessment_catalog
            WHERE category_ar IS NULL AND category IS NOT NULL
            ORDER BY template_key
            """
        )
        if missing_categories:
            print("Catalog rows with a category but no category_ar (unmapped label):")
            for row in missing_categories:
                print(f"  {row['template_key']}: category '{row['category']}'")
    finally:
        await conn.close()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
