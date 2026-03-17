"""
app.py — AI Therapist FastAPI backend (security-hardened)
---------------------------------------------------------
Changes from the original:
  1. All /patients and /assessments routes now require a valid JWT
     via the `CurrentUser` dependency.
  2. Every query that accepts a resource ID is scoped to the
     authenticated user's `org_id` — this closes the IDOR vulnerability.
  3. A /auth/login route issues JWT token pairs.
  4. A /auth/refresh route rotates access tokens without re-login.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Annotated

import asyncpg
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from auth import (
    CurrentUser,
    Role,
    TokenPair,
    create_token_pair,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
    _decode,        # used only in /auth/refresh
)

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="AI Therapist API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DB pool ─────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def _startup():
    app.state.db = await asyncpg.create_pool(dsn=os.environ["DATABASE_URL"])


@app.on_event("shutdown")
async def _shutdown():
    await app.state.db.close()


async def get_db() -> asyncpg.Pool:
    return app.state.db


DB = Annotated[asyncpg.Pool, Depends(get_db)]

# ─── Schemas ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class PatientOut(BaseModel):
    id: str
    name: str
    status: str
    risk: str
    diagnosis: str
    last_seen: datetime | None


class AssessmentResultOut(BaseModel):
    id: str
    patient_id: str
    assessment_id: str
    raw_score: int
    severity: str
    interpretation: str
    created_at: datetime


class SubmitAssessmentIn(BaseModel):
    patient_id: str
    assessment_id: str
    raw_score: int
    severity: str
    interpretation: str
    answers: dict[str, int]     # question_index → option_index

# ─── Auth routes ─────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=TokenPair, tags=["auth"])
async def login(body: LoginRequest, db: DB):
    """
    Exchange email + password for an access/refresh token pair.
    Passwords are stored as bcrypt hashes — never plaintext.
    """
    row = await db.fetchrow(
        "SELECT id, org_id, role, password_hash FROM clinicians WHERE email = $1",
        body.email,
    )
    if not row or not verify_password(body.password, row["password_hash"]):
        # Return the same error whether the user doesn't exist or the
        # password is wrong — prevents user enumeration.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    return create_token_pair(
        user_id=str(row["id"]),
        role=Role(row["role"]),
        org_id=str(row["org_id"]),
    )


@app.post("/auth/refresh", response_model=TokenPair, tags=["auth"])
async def refresh(body: RefreshRequest, db: DB):
    """
    Rotate an access token using a valid refresh token.
    The refresh token is validated server-side before issuing a new pair.
    """
    payload = _decode(body.refresh_token, "refresh")

    # Confirm the user still exists and is not suspended
    row = await db.fetchrow(
        "SELECT id, org_id, role FROM clinicians WHERE id = $1 AND active = TRUE",
        uuid.UUID(payload.sub),
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
        )

    return create_token_pair(
        user_id=payload.sub,
        role=Role(row["role"]),
        org_id=str(row["org_id"]),
    )


# ─── Patient routes — PROTECTED ───────────────────────────────────────────────

@app.get("/patients", response_model=list[PatientOut], tags=["patients"])
async def list_patients(user: CurrentUser, db: DB):
    """
    Returns only patients belonging to the authenticated user's organisation.
    IDOR fix: org_id is taken from the verified JWT, never from request params.
    """
    rows = await db.fetch(
        """
        SELECT id, name, status, risk, diagnosis, last_seen
        FROM   patients
        WHERE  org_id = $1
        ORDER  BY last_seen DESC NULLS LAST
        """,
        uuid.UUID(user.org_id),
    )
    return [dict(r) for r in rows]


@app.get("/patients/{patient_id}", response_model=PatientOut, tags=["patients"])
async def get_patient(patient_id: str, user: CurrentUser, db: DB):
    """
    Fetch a single patient — scoped to the caller's org.
    IDOR fix: the WHERE clause includes org_id so a clinician in org A
    cannot read a patient from org B even if they guess the UUID.
    """
    row = await db.fetchrow(
        """
        SELECT id, name, status, risk, diagnosis, last_seen
        FROM   patients
        WHERE  id = $1 AND org_id = $2
        """,
        uuid.UUID(patient_id),
        uuid.UUID(user.org_id),
    )
    if not row:
        # Return 404 (not 403) so callers cannot infer whether the patient
        # exists in a different org — prevents cross-tenant enumeration.
        raise HTTPException(status_code=404, detail="Patient not found.")
    return dict(row)


@app.delete(
    "/patients/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["patients"],
    dependencies=[require_role(Role.ADMIN, Role.SUPERVISOR)],
)
async def delete_patient(patient_id: str, user: CurrentUser, db: DB):
    """Requires ADMIN or SUPERVISOR role in addition to a valid JWT."""
    result = await db.execute(
        "DELETE FROM patients WHERE id = $1 AND org_id = $2",
        uuid.UUID(patient_id),
        uuid.UUID(user.org_id),
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Patient not found.")


# ─── Assessment routes — PROTECTED ────────────────────────────────────────────

@app.get(
    "/patients/{patient_id}/assessments",
    response_model=list[AssessmentResultOut],
    tags=["assessments"],
)
async def list_assessments(patient_id: str, user: CurrentUser, db: DB):
    """
    Returns assessment results for a patient — scoped to the caller's org.
    The JOIN through the patients table enforces org isolation.
    """
    rows = await db.fetch(
        """
        SELECT ar.id, ar.patient_id, ar.assessment_id,
               ar.raw_score, ar.severity, ar.interpretation, ar.created_at
        FROM   assessment_results ar
        JOIN   patients p ON p.id = ar.patient_id
        WHERE  ar.patient_id = $1
          AND  p.org_id      = $2
        ORDER  BY ar.created_at DESC
        """,
        uuid.UUID(patient_id),
        uuid.UUID(user.org_id),
    )
    return [dict(r) for r in rows]


@app.post(
    "/patients/{patient_id}/assessments",
    response_model=AssessmentResultOut,
    status_code=status.HTTP_201_CREATED,
    tags=["assessments"],
)
async def submit_assessment(
    patient_id: str,
    body: SubmitAssessmentIn,
    user: CurrentUser,
    db: DB,
):
    """
    Save a completed assessment result.
    Verifies the target patient belongs to the caller's org before inserting.
    """
    # Confirm patient ownership — prevents cross-org data injection
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id = $1 AND org_id = $2",
        uuid.UUID(patient_id),
        uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")

    new_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    await db.execute(
        """
        INSERT INTO assessment_results
            (id, patient_id, assessment_id, raw_score, severity,
             interpretation, answers, submitted_by, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
        """,
        new_id,
        uuid.UUID(patient_id),
        body.assessment_id,
        body.raw_score,
        body.severity,
        body.interpretation,
        str(body.answers),     # asyncpg casts to jsonb
        uuid.UUID(user.sub),   # audit trail: who submitted
        now,
    )

    return AssessmentResultOut(
        id=str(new_id),
        patient_id=patient_id,
        assessment_id=body.assessment_id,
        raw_score=body.raw_score,
        severity=body.severity,
        interpretation=body.interpretation,
        created_at=now,
    )


# ─── Health check (public) ───────────────────────────────────────────────────

@app.get("/health", tags=["ops"])
async def health():
    return {"status": "ok"}
