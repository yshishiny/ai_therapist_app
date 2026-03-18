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

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Annotated

import asyncpg
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pythonjsonlogger import jsonlogger
from pydantic import BaseModel, EmailStr
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

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

# ─── Structured JSON Logging ──────────────────────────────────────────────────

_handler = logging.StreamHandler()
_handler.setFormatter(
    jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
)
logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger("ai_therapist")

# ─── Rate Limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="AI Therapist API", version="2.0.0")

# Rate-limit error handler + middleware (Pydantic v2-safe pattern)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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
    logger.info("Starting AI Therapist API", extra={"version": "2.0.0"})
    app.state.db = await asyncpg.create_pool(dsn=os.environ["DATABASE_URL"])
    logger.info("Database pool created")


@app.on_event("shutdown")
async def _shutdown():
    await app.state.db.close()
    logger.info("Database pool closed")


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


class PatientCreateIn(BaseModel):
    full_name: str
    gender: str | None = None
    diagnosis: str = ""
    risk: str = "Low"
    status: str = "Active"
    phone: str | None = None
    email: str | None = None
    dob: str | None = None


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


class SessionNoteOut(BaseModel):
    id: str
    patient_id: str
    template: str
    subjective: str | None
    objective: str | None
    assessment: str | None
    plan: str | None
    free_text: str | None
    ai_draft_summary: str | None
    created_at: datetime


class SessionNoteIn(BaseModel):
    template: str = "SOAP"
    subjective: str | None = None
    objective: str | None = None
    assessment: str | None = None
    plan: str | None = None
    free_text: str | None = None
    ai_draft_summary: str | None = None


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    start_time: datetime
    end_time: datetime
    location: str
    status: str
    meeting_link: str | None


class AppointmentIn(BaseModel):
    patient_id: str
    start_time: datetime
    end_time: datetime
    location: str = "IN_PERSON"
    meeting_link: str | None = None


class HomeworkOut(BaseModel):
    id: str
    patient_id: str
    title: str
    instructions: str | None
    due_date: str | None
    status: str


class HomeworkIn(BaseModel):
    title: str
    instructions: str | None = None
    due_date: str | None = None   # ISO date string YYYY-MM-DD


class CarePlanOut(BaseModel):
    id: str
    patient_id: str
    status: str
    main_track: str | None
    goals: list | None
    created_at: datetime


class CarePlanIn(BaseModel):
    main_track: str | None = None
    goals: list | None = None
    status: str = "DRAFT"


class DashboardSummaryOut(BaseModel):
    active_cases: int
    new_this_month: int
    risk_alerts: int
    high_priority: int
    assessments_completed: int
    sessions_today: int
    sessions_remaining: int



# ─── Auth routes ─────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=TokenPair, tags=["auth"])
async def login(body: LoginRequest, db: DB):
    """
    Exchange email + password for an access/refresh token pair.
    Global rate limit: 200 req/min per IP (via SlowAPIMiddleware).
    Passwords are stored as bcrypt hashes — never plaintext.
    """
    row = await db.fetchrow(
        "SELECT id, org_id, role, password_hash FROM clinicians WHERE email = $1",
        body.email,
    )
    if not row or not verify_password(body.password, row["password_hash"]):
        # Return the same error whether the user doesn't exist or the
        # password is wrong — prevents user enumeration.
        logger.warning("Failed login attempt", extra={"email": body.email})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    logger.info("Successful login", extra={"user_id": str(row["id"]), "role": row["role"]})
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


# ─── Patient — CREATE ────────────────────────────────────────────────────────

@app.post(
    "/patients",
    response_model=PatientOut,
    status_code=status.HTTP_201_CREATED,
    tags=["patients"],
)
async def create_patient(body: PatientCreateIn, user: CurrentUser, db: DB):
    """Create a new patient in the authenticated clinician's organisation."""
    new_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    await db.execute(
        """
        INSERT INTO patients
            (id, org_id, therapist_id, name, full_name, gender,
             diagnosis, risk, status, phone, email, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$11)
        """,
        new_id,
        uuid.UUID(user.org_id),
        user.sub,
        body.full_name,
        body.gender,
        body.diagnosis,
        body.risk,
        body.status,
        body.phone,
        body.email,
        now,
    )
    logger.info("Patient created", extra={"patient_id": str(new_id), "org": user.org_id})
    return PatientOut(
        id=str(new_id),
        name=body.full_name,
        status=body.status,
        risk=body.risk,
        diagnosis=body.diagnosis,
        last_seen=None,
    )


# ─── Dashboard summary ────────────────────────────────────────────────────────

@app.get("/dashboard/summary", response_model=DashboardSummaryOut, tags=["ops"])
async def dashboard_summary(user: CurrentUser, db: DB):
    """Aggregated dashboard statistics for the authenticated clinician's org."""
    org = uuid.UUID(user.org_id)
    now = datetime.now(timezone.utc)
    # 1. Active cases
    active_cases = await db.fetchval(
        "SELECT COUNT(*) FROM patients WHERE org_id=$1 AND status='Active'", org
    ) or 0
    # 2. New this month
    new_this_month = await db.fetchval(
        """SELECT COUNT(*) FROM patients
           WHERE org_id=$1
             AND created_at >= date_trunc('month', $2::timestamptz)""",
        org, now,
    ) or 0
    # 3. High-risk patients
    high_priority = await db.fetchval(
        "SELECT COUNT(*) FROM patients WHERE org_id=$1 AND risk IN ('High','Crisis')", org
    ) or 0
    # 4. Total risk alerts = same as high_priority for now
    risk_alerts = high_priority
    # 5. Assessments completed
    assessments_completed = await db.fetchval(
        """SELECT COUNT(*) FROM assessment_results ar
           JOIN patients p ON p.id = ar.patient_id
           WHERE p.org_id = $1""",
        org,
    ) or 0
    # 6. Sessions today
    sessions_today = await db.fetchval(
        """SELECT COUNT(*) FROM appointments a
           JOIN patients p ON p.id = a.patient_id
           WHERE p.org_id = $1
             AND a.start_time::date = $2::date
             AND a.status = 'SCHEDULED'""",
        org, now,
    ) or 0
    # 7. Sessions remaining today (same as scheduled)
    sessions_remaining = sessions_today

    return DashboardSummaryOut(
        active_cases=active_cases,
        new_this_month=new_this_month,
        risk_alerts=risk_alerts,
        high_priority=high_priority,
        assessments_completed=assessments_completed,
        sessions_today=sessions_today,
        sessions_remaining=sessions_remaining,
    )


# ─── Session Notes ────────────────────────────────────────────────────────────

@app.get(
    "/patients/{patient_id}/sessions",
    response_model=list[SessionNoteOut],
    tags=["sessions"],
)
async def list_sessions(patient_id: str, user: CurrentUser, db: DB):
    """List all session notes for a patient — scoped to caller's org."""
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")
    rows = await db.fetch(
        """SELECT id, patient_id, template, subjective, objective, assessment,
                  plan, free_text, ai_draft_summary, created_at
           FROM session_notes WHERE patient_id=$1 ORDER BY created_at DESC""",
        uuid.UUID(patient_id),
    )
    return [dict(r) for r in rows]


@app.post(
    "/patients/{patient_id}/sessions",
    response_model=SessionNoteOut,
    status_code=status.HTTP_201_CREATED,
    tags=["sessions"],
)
async def create_session(patient_id: str, body: SessionNoteIn, user: CurrentUser, db: DB):
    """Create a session note for a patient."""
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")

    new_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    await db.execute(
        """INSERT INTO session_notes
               (id, patient_id, template, subjective, objective, assessment,
                plan, free_text, ai_draft_summary, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)""",
        new_id, uuid.UUID(patient_id),
        body.template, body.subjective, body.objective, body.assessment,
        body.plan, body.free_text, body.ai_draft_summary, now,
    )
    # Update patient's last_seen
    await db.execute(
        "UPDATE patients SET last_seen=$1 WHERE id=$2",
        now, uuid.UUID(patient_id),
    )
    return SessionNoteOut(
        id=str(new_id), patient_id=patient_id,
        template=body.template, subjective=body.subjective,
        objective=body.objective, assessment=body.assessment,
        plan=body.plan, free_text=body.free_text,
        ai_draft_summary=body.ai_draft_summary, created_at=now,
    )


# ─── Appointments (Calendar) ──────────────────────────────────────────────────

@app.get("/appointments", response_model=list[AppointmentOut], tags=["calendar"])
async def list_appointments(user: CurrentUser, db: DB):
    """List all appointments for the authenticated clinician's org."""
    rows = await db.fetch(
        """SELECT a.id, a.patient_id, a.start_time, a.end_time,
                  a.location, a.status, a.meeting_link
           FROM appointments a
           JOIN patients p ON p.id = a.patient_id
           WHERE p.org_id = $1
           ORDER BY a.start_time ASC""",
        uuid.UUID(user.org_id),
    )
    return [dict(r) for r in rows]


@app.post(
    "/appointments",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    tags=["calendar"],
)
async def create_appointment(body: AppointmentIn, user: CurrentUser, db: DB):
    """Create a new appointment. Patient must belong to the caller's org."""
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(body.patient_id), uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")

    new_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO appointments
               (id, patient_id, therapist_id, start_time, end_time,
                location, meeting_link, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'SCHEDULED')""",
        new_id, uuid.UUID(body.patient_id), user.sub,
        body.start_time, body.end_time, body.location, body.meeting_link,
    )
    return AppointmentOut(
        id=str(new_id), patient_id=body.patient_id,
        start_time=body.start_time, end_time=body.end_time,
        location=body.location, status="SCHEDULED",
        meeting_link=body.meeting_link,
    )


@app.patch(
    "/appointments/{appointment_id}",
    response_model=AppointmentOut,
    tags=["calendar"],
)
async def update_appointment_status(
    appointment_id: str, new_status: str, user: CurrentUser, db: DB
):
    """Update appointment status (SCHEDULED → COMPLETED / CANCELLED / NO_SHOW)."""
    row = await db.fetchrow(
        """UPDATE appointments a SET status=$1
           FROM patients p
           WHERE a.id=$2 AND a.patient_id=p.id AND p.org_id=$3
           RETURNING a.id, a.patient_id, a.start_time, a.end_time,
                     a.location, a.status, a.meeting_link""",
        new_status, uuid.UUID(appointment_id), uuid.UUID(user.org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return dict(row)


# ─── Homework Tasks ───────────────────────────────────────────────────────────

@app.get(
    "/patients/{patient_id}/homework",
    response_model=list[HomeworkOut],
    tags=["homework"],
)
async def list_homework(patient_id: str, user: CurrentUser, db: DB):
    """List all homework tasks for a patient — org-scoped."""
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")
    rows = await db.fetch(
        """SELECT id, patient_id, title, instructions,
                  due_date::text, status
           FROM homework_tasks WHERE patient_id=$1
           ORDER BY due_date ASC NULLS LAST""",
        uuid.UUID(patient_id),
    )
    return [dict(r) for r in rows]


@app.post(
    "/patients/{patient_id}/homework",
    response_model=HomeworkOut,
    status_code=status.HTTP_201_CREATED,
    tags=["homework"],
)
async def create_homework(patient_id: str, body: HomeworkIn, user: CurrentUser, db: DB):
    """Create a homework task for a patient."""
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")

    new_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO homework_tasks
               (id, patient_id, title, instructions, due_date, status)
           VALUES ($1,$2,$3,$4,$5,'ASSIGNED')""",
        new_id, uuid.UUID(patient_id), body.title, body.instructions, body.due_date,
    )
    return HomeworkOut(
        id=str(new_id), patient_id=patient_id, title=body.title,
        instructions=body.instructions, due_date=body.due_date, status="ASSIGNED",
    )


@app.patch(
    "/homework/{homework_id}",
    response_model=HomeworkOut,
    tags=["homework"],
)
async def update_homework_status(
    homework_id: str, new_status: str, user: CurrentUser, db: DB
):
    """Update homework task status (ASSIGNED → DONE / SKIPPED)."""
    row = await db.fetchrow(
        """UPDATE homework_tasks ht SET status=$1
           FROM patients p
           WHERE ht.id=$2 AND ht.patient_id=p.id AND p.org_id=$3
           RETURNING ht.id, ht.patient_id, ht.title, ht.instructions,
                     ht.due_date::text, ht.status""",
        new_status, uuid.UUID(homework_id), uuid.UUID(user.org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Homework task not found.")
    return dict(row)


# ─── Care Plans ───────────────────────────────────────────────────────────────

@app.get(
    "/patients/{patient_id}/careplans",
    response_model=list[CarePlanOut],
    tags=["careplans"],
)
async def list_careplans(patient_id: str, user: CurrentUser, db: DB):
    """List care plans for a patient — org-scoped."""
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")
    rows = await db.fetch(
        """SELECT id, patient_id, status, main_track, goals, created_at
           FROM care_plans WHERE patient_id=$1 ORDER BY created_at DESC""",
        uuid.UUID(patient_id),
    )
    return [dict(r) for r in rows]


@app.post(
    "/patients/{patient_id}/careplans",
    response_model=CarePlanOut,
    status_code=status.HTTP_201_CREATED,
    tags=["careplans"],
)
async def create_careplan(patient_id: str, body: CarePlanIn, user: CurrentUser, db: DB):
    """Create a care plan for a patient."""
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")

    import json as _json
    new_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    goals_json = _json.dumps(body.goals) if body.goals else None
    await db.execute(
        """INSERT INTO care_plans
               (id, patient_id, created_by, status, main_track, goals,
                created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$7)""",
        new_id, uuid.UUID(patient_id), user.sub,
        body.status, body.main_track, goals_json, now,
    )
    return CarePlanOut(
        id=str(new_id), patient_id=patient_id,
        status=body.status, main_track=body.main_track,
        goals=body.goals, created_at=now,
    )


# ─── Admin: Resources (Books, Handouts, Articles) ────────────────────────────

import csv
import io as _io

class ResourceIn(BaseModel):
    title: str
    author: str | None = None
    description: str | None = None
    category: str = "BOOK"
    file_url: str | None = None
    tags: list = []


class ResourceOut(BaseModel):
    id: str
    title: str
    author: str | None
    category: str
    description: str | None
    file_url: str | None
    created_at: datetime


class ContactIn(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    role: str = "REFERRER"
    organisation: str | None = None
    notes: str | None = None


class ContactOut(BaseModel):
    id: str
    full_name: str
    email: str | None
    phone: str | None
    role: str
    organisation: str | None


class AssessmentQuestionIn(BaseModel):
    assessment_id: str
    question_index: int
    question_text: str
    response_type: str = "LIKERT"
    options: list | None = None
    reverse_scored: bool = False


class AssessmentQuestionOut(BaseModel):
    id: str
    assessment_id: str
    question_index: int
    question_text: str
    response_type: str
    options: list | None


@app.get("/admin/resources", response_model=list[ResourceOut], tags=["admin"])
async def list_resources(user: CurrentUser, db: DB):
    """List all resources for this org. Admin and clinician access."""
    rows = await db.fetch(
        """SELECT id, title, author, category, description, file_url, created_at
           FROM resources WHERE org_id = $1 ORDER BY created_at DESC""",
        uuid.UUID(user.org_id),
    )
    return [dict(r) for r in rows]


@app.post(
    "/admin/resources",
    response_model=ResourceOut,
    status_code=status.HTTP_201_CREATED,
    tags=["admin"],
    dependencies=[require_role(Role.ADMIN)],
)
async def create_resource(body: ResourceIn, user: CurrentUser, db: DB):
    """Create a resource (admin only)."""
    import json as _json
    new_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    await db.execute(
        """INSERT INTO resources
               (id, org_id, uploaded_by, title, author, category,
                description, file_url, tags, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)""",
        new_id, uuid.UUID(user.org_id), uuid.UUID(user.sub),
        body.title, body.author, body.category,
        body.description, body.file_url, _json.dumps(body.tags), now,
    )
    return ResourceOut(
        id=str(new_id), title=body.title, author=body.author,
        category=body.category, description=body.description,
        file_url=body.file_url, created_at=now,
    )


@app.post(
    "/admin/resources/import",
    tags=["admin"],
    dependencies=[require_role(Role.ADMIN)],
)
async def import_resources_csv(user: CurrentUser, db: DB, csv_text: str = ""):
    """
    Bulk-import resources from CSV.
    Expected columns: title, author, category, description, file_url
    Pass CSV body as plain-text form field 'csv_text'.
    """
    reader = csv.DictReader(_io.StringIO(csv_text))
    created = 0
    import json as _json
    now = datetime.now(timezone.utc)
    for row in reader:
        if not row.get("title"):
            continue
        await db.execute(
            """INSERT INTO resources
                   (id, org_id, uploaded_by, title, author, category,
                    description, file_url, tags, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'[]',$9)
               ON CONFLICT DO NOTHING""",
            uuid.uuid4(),
            uuid.UUID(user.org_id),
            uuid.UUID(user.sub),
            row["title"],
            row.get("author"),
            row.get("category", "BOOK"),
            row.get("description"),
            row.get("file_url"),
            now,
        )
        created += 1
    return {"imported": created}


# ─── Admin: Contacts ─────────────────────────────────────────────────────────

@app.get("/admin/contacts", response_model=list[ContactOut], tags=["admin"])
async def list_contacts(user: CurrentUser, db: DB):
    """List all contacts for this org."""
    rows = await db.fetch(
        """SELECT id, full_name, email, phone, role, organisation
           FROM contacts WHERE org_id = $1 ORDER BY full_name ASC""",
        uuid.UUID(user.org_id),
    )
    return [dict(r) for r in rows]


@app.post(
    "/admin/contacts",
    response_model=ContactOut,
    status_code=status.HTTP_201_CREATED,
    tags=["admin"],
    dependencies=[require_role(Role.ADMIN)],
)
async def create_contact(body: ContactIn, user: CurrentUser, db: DB):
    """Create a contact record (admin only)."""
    new_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO contacts
               (id, org_id, full_name, email, phone, role, organisation, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
        new_id, uuid.UUID(user.org_id),
        body.full_name, body.email, body.phone,
        body.role, body.organisation, body.notes,
    )
    return ContactOut(
        id=str(new_id), full_name=body.full_name, email=body.email,
        phone=body.phone, role=body.role, organisation=body.organisation,
    )


@app.post(
    "/admin/contacts/import",
    tags=["admin"],
    dependencies=[require_role(Role.ADMIN)],
)
async def import_contacts_csv(user: CurrentUser, db: DB, csv_text: str = ""):
    """
    Bulk-import contacts from CSV.
    Expected columns: full_name, email, phone, role, organisation
    """
    reader = csv.DictReader(_io.StringIO(csv_text))
    created = 0
    for row in reader:
        if not row.get("full_name"):
            continue
        await db.execute(
            """INSERT INTO contacts
                   (id, org_id, full_name, email, phone, role, organisation)
               VALUES ($1,$2,$3,$4,$5,$6,$7)
               ON CONFLICT DO NOTHING""",
            uuid.uuid4(),
            uuid.UUID(user.org_id),
            row["full_name"],
            row.get("email"),
            row.get("phone"),
            row.get("role", "REFERRER"),
            row.get("organisation"),
        )
        created += 1
    return {"imported": created}


# ─── Admin: Assessment Questions ─────────────────────────────────────────────

@app.get(
    "/admin/assessments/{assessment_id}/questions",
    response_model=list[AssessmentQuestionOut],
    tags=["admin"],
)
async def list_assessment_questions(assessment_id: str, user: CurrentUser, db: DB):
    """List custom assessment questions for this org and assessment."""
    rows = await db.fetch(
        """SELECT id, assessment_id, question_index, question_text,
                  response_type, options
           FROM assessment_questions
           WHERE org_id=$1 AND assessment_id=$2
           ORDER BY question_index ASC""",
        uuid.UUID(user.org_id), assessment_id,
    )
    return [dict(r) for r in rows]


@app.post(
    "/admin/assessments/{assessment_id}/questions",
    response_model=AssessmentQuestionOut,
    status_code=status.HTTP_201_CREATED,
    tags=["admin"],
    dependencies=[require_role(Role.ADMIN)],
)
async def create_assessment_question(
    assessment_id: str, body: AssessmentQuestionIn, user: CurrentUser, db: DB
):
    """Add a custom question to an assessment (admin only)."""
    import json as _json
    new_id = uuid.uuid4()
    options_json = _json.dumps(body.options) if body.options else None
    await db.execute(
        """INSERT INTO assessment_questions
               (id, org_id, assessment_id, question_index, question_text,
                response_type, options, reverse_scored)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
           ON CONFLICT (org_id, assessment_id, question_index)
           DO UPDATE SET question_text=EXCLUDED.question_text,
                         response_type=EXCLUDED.response_type,
                         options=EXCLUDED.options""",
        new_id, uuid.UUID(user.org_id), assessment_id,
        body.question_index, body.question_text,
        body.response_type, options_json, body.reverse_scored,
    )
    return AssessmentQuestionOut(
        id=str(new_id),
        assessment_id=assessment_id,
        question_index=body.question_index,
        question_text=body.question_text,
        response_type=body.response_type,
        options=body.options,
    )
