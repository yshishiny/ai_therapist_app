"""
create_admin.py — One-time seed script for AI Therapist backend
----------------------------------------------------------------
Run this ONCE after deploying to Railway to create the first
admin clinician account and organisation.

Usage:
    python create_admin.py --email admin@clinic.com --password YourPass123 --org-name "My Clinic"

Requirements:
    pip install asyncpg passlib[bcrypt] python-dotenv

Environment variables (or set in .env):
    DATABASE_URL — Railway PostgreSQL connection string
"""

from __future__ import annotations

import argparse
import asyncio
import os
import uuid

import asyncpg
from passlib.context import CryptContext

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv optional — env vars may be set directly

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_admin(email: str, password: str, org_name: str) -> None:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise EnvironmentError(
            "DATABASE_URL is not set. "
            "Export it or create a .env file with your Railway PostgreSQL URL."
        )

    conn = await asyncpg.connect(dsn=dsn)
    try:
        # 1. Create or reuse the organisation
        existing_org = await conn.fetchrow(
            "SELECT id FROM organisations WHERE name = $1", org_name
        )
        if existing_org:
            org_id = existing_org["id"]
            print(f"✔  Organisation already exists: {org_name} (id={org_id})")
        else:
            org_id = uuid.uuid4()
            await conn.execute(
                "INSERT INTO organisations (id, name) VALUES ($1, $2)",
                org_id, org_name,
            )
            print(f"✔  Created organisation: {org_name} (id={org_id})")

        # 2. Check if email already taken
        existing = await conn.fetchrow(
            "SELECT id FROM clinicians WHERE email = $1", email
        )
        if existing:
            print(f"⚠  A clinician with email {email} already exists — aborting.")
            return

        # 3. Hash password and insert clinician
        password_hash = _pwd_ctx.hash(password)
        clinician_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO clinicians (id, org_id, email, password_hash, role, active)
            VALUES ($1, $2, $3, $4, 'admin', TRUE)
            """,
            clinician_id, org_id, email, password_hash,
        )
        print(f"✔  Created admin clinician: {email} (id={clinician_id})")
        print()
        print("You can now log in with:")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print()
        print("IMPORTANT: Change this password after first login!")

    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed the first admin clinician account."
    )
    parser.add_argument("--email",    required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Initial password (change after login)")
    parser.add_argument("--org-name", required=True, dest="org_name",
                        help="Organisation / clinic name")
    args = parser.parse_args()

    asyncio.run(create_admin(args.email, args.password, args.org_name))
