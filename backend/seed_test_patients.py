"""
seed_test_patients.py — 10 diverse test patients for exercising the app
------------------------------------------------------------------
Spans age (16-67), gender, diagnosis domain (matched to instruments
already in the catalog), risk level, and status, split across the two
real clinician accounts so caseload/assignment features get exercised
too. Test/demo data, not real patients.

Usage:
    DATABASE_HOST=... DB_PASSWORD=... python seed_test_patients.py
"""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import date, datetime, timezone

import asyncpg

ORG_ID = "40884157-aa21-49ec-9db6-0c94ca96a914"
HEBA_ID = "bec1aca8-bd34-4557-99f3-da8da029a7e8"
YASSER_ID = "8a333ea7-c972-4db8-8236-f48657d1e4c9"

PATIENTS = [
    {"full_name": "Layla Hassan", "gender": "Female", "dob": "2002-03-14", "diagnosis": "Major depressive disorder", "risk": "Med", "status": "Active", "therapist_id": HEBA_ID},
    {"full_name": "Ahmed Farouk", "gender": "Male", "dob": "1995-07-02", "diagnosis": "Generalized anxiety disorder", "risk": "Low", "status": "Active", "therapist_id": HEBA_ID},
    {"full_name": "Nour El-Sayed", "gender": "Female", "dob": "2009-01-22", "diagnosis": "PTSD (trauma-related)", "risk": "High", "status": "Active", "therapist_id": HEBA_ID},
    {"full_name": "Mostafa Adel", "gender": "Male", "dob": "1981-11-09", "diagnosis": "Alcohol use disorder", "risk": "High", "status": "Active", "therapist_id": YASSER_ID},
    {"full_name": "Youssef Kamal", "gender": "Male", "dob": "2010-05-30", "diagnosis": "ADHD", "risk": "Low", "status": "Intake", "therapist_id": HEBA_ID},
    {"full_name": "Dina Mansour", "gender": "Female", "dob": "1997-09-18", "diagnosis": "Obsessive-compulsive disorder", "risk": "Med", "status": "Active", "therapist_id": HEBA_ID},
    {"full_name": "Karim Reda", "gender": "Male", "dob": "1974-02-27", "diagnosis": "Occupational burnout", "risk": "Low", "status": "Maintenance", "therapist_id": YASSER_ID},
    {"full_name": "Hana Zaki", "gender": "Female", "dob": "1988-06-11", "diagnosis": "Eating disorder (bulimia nervosa)", "risk": "Med", "status": "Active", "therapist_id": YASSER_ID},
    {"full_name": "Omar Naguib", "gender": "Male", "dob": "1959-12-05", "diagnosis": "Adjustment disorder with grief", "risk": "Low", "status": "Active", "therapist_id": HEBA_ID},
    {"full_name": "Sami Younes", "gender": "Non-binary", "dob": "2004-04-08", "diagnosis": "Panic disorder with social anxiety", "risk": "Med", "status": "Intake", "therapist_id": YASSER_ID},
]


async def main() -> None:
    conn = await asyncpg.connect(
        user="appuser",
        password=os.environ["DB_PASSWORD"],
        database="ai_therapist",
        host=os.environ["DATABASE_HOST"],
        ssl="require",
    )

    now = datetime.now(timezone.utc)
    for p in PATIENTS:
        existing = await conn.fetchval(
            "SELECT 1 FROM patients WHERE org_id = $1 AND name = $2", uuid.UUID(ORG_ID), p["full_name"]
        )
        if existing:
            print(f"skip (already exists): {p['full_name']}")
            continue
        new_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO patients
                (id, org_id, therapist_id, name, full_name, gender, dob,
                 diagnosis, risk, status, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$10)
            """,
            new_id,
            uuid.UUID(ORG_ID),
            p["therapist_id"],
            p["full_name"],
            p["gender"],
            date.fromisoformat(p["dob"]),
            p["diagnosis"],
            p["risk"],
            p["status"],
            now,
        )
        print(f"created: {p['full_name']} ({p['diagnosis']})")

    print("=== patients now in org ===")
    for r in await conn.fetch(
        "SELECT name, gender, dob, diagnosis, risk, status, therapist_id FROM patients WHERE org_id = $1 ORDER BY dob",
        uuid.UUID(ORG_ID),
    ):
        print(dict(r))

    await conn.close()


asyncio.run(main())
