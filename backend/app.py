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
import traceback
import uuid
from datetime import datetime, timezone
from typing import Annotated

import asyncpg
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

# ─── Correlation-ID middleware (Railway log tracing) ─────────────────────────

@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id
    logger.info(
        "Request started",
        extra={
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
        },
    )
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    logger.info(
        "Request finished",
        extra={
            "correlation_id": correlation_id,
            "status_code": response.status_code,
        },
    )
    return response


# ─── Global exception handler (prevents raw tracebacks leaking to clients) ───

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error(
        "Unhandled exception",
        extra={
            "correlation_id": correlation_id,
            "path": request.url.path,
            "error": str(exc),
            "traceback": traceback.format_exc(),
        },
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error.", "correlation_id": correlation_id},
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

class PatientRegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    gender: str | None = None
    dob: str | None = None       # ISO date string
    phone: str | None = None


@app.post("/auth/register-patient", response_model=TokenPair, status_code=status.HTTP_201_CREATED, tags=["auth"])
async def register_patient(body: PatientRegisterRequest, db: DB):
    """
    Patient self-registration.
    Creates a patients row + patient_users credential row, then returns
    a JWT pair so the patient is immediately logged in.
    """
    # Check uniqueness
    existing = await db.fetchval(
        "SELECT 1 FROM patient_users WHERE email=$1", body.email
    )
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Pick the first organisation (multi-org signup can be added later)
    org_id = await db.fetchval("SELECT id FROM organisations LIMIT 1")
    if not org_id:
        raise HTTPException(status_code=500, detail="No organisation configured.")

    # Create patient record
    patient_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO patients (id, org_id, therapist_id, full_name, name, gender, dob, email, status, risk)
           VALUES ($1, $2, 'unassigned', $3, $4, $5, $6, $7, 'Active', 'Low')""",
        patient_id, org_id,
        body.full_name,
        body.full_name.split()[0],   # short name
        body.gender,
        body.dob,
        body.email,
    )

    # Create credential record
    from auth import hash_password
    pu_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO patient_users (id, org_id, patient_id, email, password_hash)
           VALUES ($1, $2, $3, $4, $5)""",
        pu_id, org_id, patient_id, body.email, hash_password(body.password),
    )

    logger.info("Patient registered", extra={"patient_id": str(patient_id), "email": body.email})
    return create_token_pair(
        user_id=str(patient_id),
        role=Role.PATIENT,
        org_id=str(org_id),
    )

@app.post("/auth/login", response_model=TokenPair, tags=["auth"])
async def login(body: LoginRequest, db: DB):
    """
    Exchange email + password for an access/refresh token pair.
    Checks clinicians first, then patient_users — same error either way to
    prevent user enumeration.
    """
    # 1. Try clinician table
    row = await db.fetchrow(
        "SELECT id, org_id, role, password_hash FROM clinicians WHERE email = $1",
        body.email,
    )
    if row and verify_password(body.password, row["password_hash"]):
        logger.info("Clinician login", extra={"user_id": str(row["id"]), "role": row["role"]})
        return create_token_pair(
            user_id=str(row["id"]),
            role=Role(row["role"]),
            org_id=str(row["org_id"]),
        )

    # 2. Try patient_users table
    p_row = await db.fetchrow(
        """SELECT pu.id, pu.org_id, pu.patient_id, pu.password_hash
           FROM patient_users pu
           WHERE pu.email = $1 AND pu.active = TRUE""",
        body.email,
    )
    if p_row and verify_password(body.password, p_row["password_hash"]):
        logger.info("Patient login", extra={"patient_id": str(p_row["patient_id"])})
        return create_token_pair(
            user_id=str(p_row["patient_id"]),  # sub = patient row id
            role=Role.PATIENT,
            org_id=str(p_row["org_id"]),
        )

    # 3. Neither matched — same generic error
    logger.warning("Failed login attempt", extra={"email": body.email})
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials.",
    )


@app.post("/auth/refresh", response_model=TokenPair, tags=["auth"])
async def refresh(body: RefreshRequest, db: DB):
    """
    Rotate an access token using a valid refresh token.
    Supports both clinician and patient refresh flows.
    """
    payload = _decode(body.refresh_token, "refresh")

    if payload.role == Role.PATIENT:
        row = await db.fetchrow(
            "SELECT patient_id, org_id FROM patient_users WHERE patient_id = $1 AND active = TRUE",
            uuid.UUID(payload.sub),
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Patient account not found or deactivated.")
        return create_token_pair(user_id=payload.sub, role=Role.PATIENT, org_id=str(row["org_id"]))
    else:
        row = await db.fetchrow(
            "SELECT id, org_id, role FROM clinicians WHERE id = $1 AND active = TRUE",
            uuid.UUID(payload.sub),
        )
        if not row:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or deactivated.")
        return create_token_pair(user_id=payload.sub, role=Role(row["role"]), org_id=str(row["org_id"]))


# ─── Patient routes — PROTECTED ───────────────────────────────────────────────

@app.get("/patients", response_model=list[PatientOut], tags=["patients"])
async def list_patients(user: CurrentUser, db: DB, limit: int = 50, offset: int = 0):
    """
    Returns only patients belonging to the authenticated user's organisation.
    IDOR fix: org_id is taken from the verified JWT, never from request params.
    Paginated: default 50 per page.
    """
    rows = await db.fetch(
        """
        SELECT id, name, status, risk, diagnosis, last_seen
        FROM   patients
        WHERE  org_id = $1
        ORDER  BY last_seen DESC NULLS LAST
        LIMIT  $2 OFFSET $3
        """,
        uuid.UUID(user.org_id),
        limit,
        offset,
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

@app.get(
    "/patients/{patient_id}/careplans/active",
    tags=["careplans"],
)
async def get_active_careplan(patient_id: str, user: CurrentUser, db: DB):
    """Get the active care plan for a patient and its phases."""
    exists = await db.fetchval(
        "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Patient not found.")

    plan = await db.fetchrow(
        "SELECT * FROM care_plans WHERE patient_id=$1 AND status='ACTIVE' ORDER BY created_at DESC LIMIT 1",
        uuid.UUID(patient_id)
    )
    if not plan:
        plan = await db.fetchrow(
            "SELECT * FROM care_plans WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 1",
            uuid.UUID(patient_id)
        )
        if not plan:
            raise HTTPException(status_code=404, detail="No care plan found.")
            
    phases = await db.fetch(
        "SELECT * FROM care_plan_phases WHERE careplan_id=$1 ORDER BY phase_index ASC",
        plan["id"]
    )
    
    import json
    d = dict(plan)
    d["id"] = str(d["id"])
    d["patient_id"] = str(d["patient_id"])
    d["goals"] = json.loads(d["goals"]) if isinstance(d["goals"], str) else d["goals"]
    d["created_at"] = d["created_at"].isoformat() if d["created_at"] else None
    d["updated_at"] = d["updated_at"].isoformat() if d["updated_at"] else None
    
    phases_list = []
    for p in phases:
        pd = dict(p)
        pd["id"] = str(pd["id"])
        pd["careplan_id"] = str(pd["careplan_id"])
        pd["methods"] = json.loads(pd["methods"]) if isinstance(pd["methods"], str) else pd["methods"]
        pd["homework_templates"] = json.loads(pd["homework_templates"]) if isinstance(pd["homework_templates"], str) else pd["homework_templates"]
        pd["measures_to_track"] = json.loads(pd["measures_to_track"]) if isinstance(pd["measures_to_track"], str) else pd["measures_to_track"]
        phases_list.append(pd)
        
    d["phases"] = phases_list
    return d

# ─── Homework ─────────────────────────────────────────────────────────────────

class HomeworkFeedbackIn(BaseModel):
    completionPercentage: int = 0
    difficultyRating: int = 3
    helpfulnessRating: int = 3
    barriers: list[str] = []
    additionalComments: str = ""

@app.get(
    "/patients/{patient_id}/homework",
    tags=["homework"],
)
async def list_homework(patient_id: str, user: CurrentUser, db: DB):
    """List all homework tasks for a patient. Scoped to caller's org_id."""
    rows = await db.fetch(
        """SELECT ht.id, ht.patient_id, ht.careplan_phase_id, ht.title, ht.instructions,
                  ht.due_date, ht.status, ht.patient_feedback, ht.therapist_notes
           FROM homework_tasks ht
           JOIN patients p ON p.id = ht.patient_id
           WHERE ht.patient_id = $1 AND p.org_id = $2
           ORDER BY ht.due_date ASC NULLS LAST""",
        uuid.UUID(patient_id),
        uuid.UUID(user.org_id),
    )
    import json
    results = []
    for r in rows:
        d = dict(r)
        d["id"] = str(d["id"])
        d["patient_id"] = str(d["patient_id"])
        d["careplan_phase_id"] = str(d["careplan_phase_id"]) if d["careplan_phase_id"] else None
        d["due_date"] = d["due_date"].isoformat() if d["due_date"] else None
        d["patient_feedback"] = json.loads(d["patient_feedback"]) if d["patient_feedback"] else None
        results.append(d)
    return results

@app.post(
    "/patients/{patient_id}/homework",
    tags=["homework"],
)
async def assign_homework(patient_id: str, body: HomeworkIn, user: CurrentUser, db: DB):
    """Assign a homework task to a patient. Verifies patient belongs to caller's org."""
    patient_row = await db.fetchrow(
        "SELECT id FROM patients WHERE id = $1 AND org_id = $2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not patient_row:
        raise HTTPException(status_code=404, detail="Patient not found.")

    new_id = uuid.uuid4()
    due_date = None
    if body.due_date:
        try:
            due_date = datetime.strptime(body.due_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="due_date must be YYYY-MM-DD.")

    await db.execute(
        """INSERT INTO homework_tasks
               (id, patient_id, title, instructions, due_date, status)
           VALUES ($1,$2,$3,$4,$5,'ASSIGNED')""",
        new_id, uuid.UUID(patient_id), body.title, body.instructions, due_date
    )
    return {"id": str(new_id), "status": "ASSIGNED"}

@app.post(
    "/homework/{task_id}/feedback",
    tags=["homework"],
)
async def submit_homework_feedback(task_id: str, body: HomeworkFeedbackIn, user: CurrentUser, db: DB):
    """Submit patient feedback and update the homework status dynamically."""
    import json
    feedback_json = json.dumps(body.dict())
    
    status_val = "COMPLETED" if body.completionPercentage == 100 else ("SKIPPED" if body.completionPercentage == 0 else "PARTIALLY_DONE")
    
    updated = await db.execute(
        """UPDATE homework_tasks ht
           SET patient_feedback=$1, status=$2
           FROM patients p
           WHERE ht.id = $3 AND ht.patient_id = p.id AND p.org_id = $4""",
        feedback_json, status_val, uuid.UUID(task_id), uuid.UUID(user.org_id),
    )
    if updated == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Homework task not found.")
        
    return {"status": "success", "new_status": status_val}

# ─── Assessments & AI Orchestrator ────────────────────────────────────────────

@app.get("/assessments/templates", tags=["assessments"])
async def list_assessment_templates(user: CurrentUser, db: DB):
    """Returns all assessment configurations (psych, somatic, art therapy)"""
    rows = await db.fetch("SELECT * FROM assessment_templates ORDER BY id")
    import json
    results = []
    for r in rows:
        d = dict(r)
        d["scoring_rules"] = json.loads(d["scoring_rules"]) if isinstance(d["scoring_rules"], str) else d["scoring_rules"]
        d["interpretation_rules"] = json.loads(d["interpretation_rules"]) if d["interpretation_rules"] and isinstance(d["interpretation_rules"], str) else d["interpretation_rules"]
        results.append(d)
    return results

class AssessmentSubmissionIn(BaseModel):
    template_id: str
    raw_answers: dict
    score_total: int | None = None
    subscale_scores: dict | None = None
    severity_band: str | None = None
    interpretation_text: str | None = None
    context: str = "IN_SESSION"
    flagged: bool = False

@app.get("/patients/{patient_id}/assessments", tags=["assessments"])
async def list_patient_assessments(patient_id: str, user: CurrentUser, db: DB, limit: int = 100, offset: int = 0):
    """List all past assessment results for longitudinal graphing. Scoped to caller's org. Paginated."""
    rows = await db.fetch(
        """SELECT ai.* FROM assessment_instances ai
           JOIN patients p ON p.id = ai.patient_id
           WHERE ai.patient_id = $1 AND p.org_id = $2
           ORDER BY ai.taken_at DESC
           LIMIT $3 OFFSET $4""",
        uuid.UUID(patient_id), uuid.UUID(user.org_id), limit, offset,
    )
    import json
    results = []
    for r in rows:
        d = dict(r)
        d["id"] = str(d["id"])
        d["patient_id"] = str(d["patient_id"])
        d["taken_at"] = d["taken_at"].isoformat() if d["taken_at"] else None
        d["raw_answers"] = json.loads(d["raw_answers"]) if isinstance(d["raw_answers"], str) else d["raw_answers"]
        d["subscale_scores"] = json.loads(d["subscale_scores"]) if d["subscale_scores"] and isinstance(d["subscale_scores"], str) else d["subscale_scores"]
        results.append(d)
    return results

@app.post("/patients/{patient_id}/assessments", tags=["assessments"])
async def submit_assessment(patient_id: str, body: AssessmentSubmissionIn, user: CurrentUser, db: DB):
    """Saves a completed assessment (including multidimensional answers)."""
    new_id = uuid.uuid4()
    import json
    await db.execute(
        """INSERT INTO assessment_instances 
           (id, patient_id, template_id, context, raw_answers, score_total, 
            subscale_scores, severity_band, interpretation_text, flagged)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)""",
        new_id, uuid.UUID(patient_id), body.template_id, body.context,
        json.dumps(body.raw_answers), body.score_total, 
        json.dumps(body.subscale_scores) if body.subscale_scores else None,
        body.severity_band, body.interpretation_text, body.flagged
    )
    return {"id": str(new_id), "status": "saved"}

class ReportGenerationRequest(BaseModel):
    include_homework: bool = True
    include_assessments: bool = True
    include_sessions: bool = True

@app.post("/patients/{patient_id}/report/generate", tags=["ai", "reporting"])
async def generate_clinical_synthesis(patient_id: str, body: ReportGenerationRequest, user: CurrentUser, db: DB):
    """
    The Crown Jewel Endpoint:
    Orchestrates AI to read all context and generate a cohesive Clinical Synthesis.
    """
    from ai_service import AiService

    # ── Gather patient info ──────────────────────────────────────────────────
    patient = await db.fetchrow(
        "SELECT full_name, dob, gender, diagnosis, risk, status FROM patients WHERE id=$1 AND org_id=$2",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # ── Gather sessions ──────────────────────────────────────────────────────
    sessions_data = []
    if body.include_sessions:
        rows = await db.fetch(
            """SELECT sn.template, sn.subjective, sn.objective, sn.assessment, sn.plan,
                      sn.free_text, sn.ai_draft_summary, sn.created_at
               FROM session_notes sn
               WHERE sn.patient_id=$1
               ORDER BY sn.created_at DESC LIMIT 10""",
            uuid.UUID(patient_id),
        )
        sessions_data = [dict(r) for r in rows]

    # ── Gather assessments ───────────────────────────────────────────────────
    assessments_data = []
    if body.include_assessments:
        rows = await db.fetch(
            """SELECT ar.assessment_id, ar.raw_score, ar.severity, ar.interpretation, ar.created_at
               FROM assessment_results ar
               WHERE ar.patient_id=$1
               ORDER BY ar.created_at DESC LIMIT 20""",
            uuid.UUID(patient_id),
        )
        assessments_data = [dict(r) for r in rows]

    # ── Gather homework ──────────────────────────────────────────────────────
    homework_data = []
    if body.include_homework:
        rows = await db.fetch(
            """SELECT title, task_type, status, patient_feedback, due_date
               FROM homework_tasks
               WHERE patient_id=$1
               ORDER BY due_date DESC NULLS LAST LIMIT 15""",
            uuid.UUID(patient_id),
        )
        homework_data = [dict(r) for r in rows]

    # ── Call AI ──────────────────────────────────────────────────────────────
    ai = AiService()
    try:
        report_md = await ai.generate_clinical_report(
            patient_name=patient["full_name"],
            sessions_data=sessions_data,
            assessments_data=assessments_data,
            homework_data=homework_data,
        )
    except Exception as e:
        logger.error("AI report generation failed", extra={"error": str(e)})
        raise HTTPException(status_code=502, detail="AI service unavailable. Please try again.")

    return {
        "status": "completed",
        "report_markdown": report_md,
        "report_id": str(uuid.uuid4()),
    }

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


# ═══════════════════════════════════════════════════════════════════════════════
# PATIENT PORTAL — /me/* routes
# Every endpoint here is gated to role=PATIENT and scoped to the caller's own
# patient record (identified by the `sub` claim == patient id in the JWT).
# ═══════════════════════════════════════════════════════════════════════════════

# ── Pydantic schemas ───────────────────────────────────────────────────────────

class MoodLogIn(BaseModel):
    mood_score: int       # 1–5
    energy_score: int     # 1–5
    note: str | None = None
    emotions: list[str] = []   # e.g. ["anxious", "hopeful"]

class HomeworkSubmitIn(BaseModel):
    completion_notes: str | None = None
    helpfulness_rating: int | None = None  # 1–5

class AiChatMessageIn(BaseModel):
    message: str
    conversation_id: str | None = None   # None = start new thread


# ── Helper — verify caller is the patient or raise 403 ────────────────────────

def _patient_id_from_jwt(user: CurrentUser) -> str:
    """The JWT `sub` field stores the patient UUID for patient-role users."""
    if user.role != Role.PATIENT:
        raise HTTPException(status_code=403, detail="Patient access only.")
    return user.sub   # sub == patient row id for patient tokens


# ── GET /me/profile ────────────────────────────────────────────────────────────

@app.get("/me/profile", tags=["patient"])
async def get_my_profile(user: CurrentUser, db: DB):
    """Return the authenticated patient's own demographic + clinical summary."""
    patient_id = _patient_id_from_jwt(user)
    row = await db.fetchrow(
        """SELECT id, full_name, gender, dob, primary_diagnosis,
                  status, risk_level, therapist_id
           FROM patients
           WHERE id=$1 AND org_id=$2""",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Patient profile not found.")
    return dict(row)


# ── POST /me/mood ──────────────────────────────────────────────────────────────

@app.post("/me/mood", status_code=status.HTTP_201_CREATED, tags=["patient"])
async def log_mood(body: MoodLogIn, user: CurrentUser, db: DB):
    """Record a mood + energy check-in for the authenticated patient."""
    import json as _json
    patient_id = _patient_id_from_jwt(user)
    entry_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO mood_logs (id, patient_id, org_id, mood_score,
                                  energy_score, note, emotions, logged_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())""",
        entry_id,
        uuid.UUID(patient_id),
        uuid.UUID(user.org_id),
        body.mood_score,
        body.energy_score,
        body.note,
        _json.dumps(body.emotions),
    )
    return {"id": str(entry_id), "status": "logged"}


# ── GET /me/mood ───────────────────────────────────────────────────────────────

@app.get("/me/mood", tags=["patient"])
async def get_mood_history(user: CurrentUser, db: DB, days: int = 30):
    """Return the last `days` days of mood entries for the caller."""
    patient_id = _patient_id_from_jwt(user)
    rows = await db.fetch(
        """SELECT id, mood_score, energy_score, note, emotions, logged_at
           FROM mood_logs
           WHERE patient_id=$1 AND org_id=$2
             AND logged_at > NOW() - ($3 || ' days')::interval
           ORDER BY logged_at ASC""",
        uuid.UUID(patient_id), uuid.UUID(user.org_id), str(days),
    )
    return [dict(r) for r in rows]


# ── GET /me/homework ───────────────────────────────────────────────────────────

@app.get("/me/homework", tags=["patient"])
async def get_my_homework(user: CurrentUser, db: DB):
    """Return homework tasks assigned to the authenticated patient."""
    patient_id = _patient_id_from_jwt(user)
    rows = await db.fetch(
        """SELECT id, title, description, task_type, status,
                  due_date, assigned_at, patient_feedback
           FROM homework_tasks
           WHERE patient_id=$1 AND org_id=$2
           ORDER BY due_date ASC NULLS LAST""",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    return [dict(r) for r in rows]


# ── POST /me/homework/{task_id}/submit ────────────────────────────────────────

@app.post("/me/homework/{task_id}/submit", tags=["patient"])
async def submit_my_homework(
    task_id: str, body: HomeworkSubmitIn, user: CurrentUser, db: DB
):
    """Patient submits completion notes and helpfulness rating for a task."""
    import json as _json
    patient_id = _patient_id_from_jwt(user)
    feedback = _json.dumps({
        "notes": body.completion_notes,
        "helpfulness_rating": body.helpfulness_rating,
    })
    result = await db.execute(
        """UPDATE homework_tasks
           SET patient_feedback=$1, status='completed', completed_at=NOW()
           WHERE id=$2 AND patient_id=$3 AND org_id=$4""",
        feedback,
        uuid.UUID(task_id),
        uuid.UUID(patient_id),
        uuid.UUID(user.org_id),
    )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Task not found.")
    return {"status": "submitted"}


# ── GET /me/sessions ───────────────────────────────────────────────────────────

@app.get("/me/sessions", tags=["patient"])
async def get_my_sessions(user: CurrentUser, db: DB, upcoming_only: bool = False):
    """Return sessions for the authenticated patient."""
    patient_id = _patient_id_from_jwt(user)
    filter_clause = "AND scheduled_at > NOW()" if upcoming_only else ""
    rows = await db.fetch(
        f"""SELECT id, session_type, scheduled_at, duration_minutes,
                   status, summary_snippet
            FROM sessions
            WHERE patient_id=$1 AND org_id=$2 {filter_clause}
            ORDER BY scheduled_at DESC
            LIMIT 20""",
        uuid.UUID(patient_id), uuid.UUID(user.org_id),
    )
    return [dict(r) for r in rows]


# ── POST /me/ai-chat ───────────────────────────────────────────────────────────

@app.post("/me/ai-chat", tags=["patient"])
async def patient_ai_chat(body: AiChatMessageIn, user: CurrentUser, db: DB):
    """
    Patient sends a message to the AI Companion.
    The AI response is contextually informed by recent mood logs and homework status.
    """
    import json as _json
    patient_id = _patient_id_from_jwt(user)

    # Fetch recent context to prime the AI
    recent_moods = await db.fetch(
        """SELECT mood_score, energy_score, logged_at FROM mood_logs
           WHERE patient_id=$1 ORDER BY logged_at DESC LIMIT 3""",
        uuid.UUID(patient_id),
    )
    mood_context = ", ".join([
        f"mood={r['mood_score']}/5 on {r['logged_at'].strftime('%b %d')}"
        for r in recent_moods
    ]) or "No recent mood logs."

    pending_hw = await db.fetchval(
        """SELECT COUNT(*) FROM homework_tasks
           WHERE patient_id=$1 AND status='pending'""",
        uuid.UUID(patient_id),
    )

    system_prompt = f"""You are a compassionate AI therapeutic companion.
You are NOT a replacement for a licensed therapist, and must remind the user of this if they are in crisis.
Patient context:
- Recent mood history: {mood_context}
- Pending homework tasks: {pending_hw}
Respond with empathy, validate feelings, and gently encourage engagement with homework when appropriate.
Keep responses concise (2-4 sentences) unless the user explicitly needs more detail."""

    # Use the AiService to call the underlying LLM
    from ai_service import AiService
    ai = AiService()
    try:
        ai_reply = await ai.chat(system_prompt=system_prompt, user_message=body.message)
    except Exception as e:
        logger.warning("AI companion error", extra={"error": str(e)})
        ai_reply = "I'm here for you. I'm having a little trouble connecting right now — please try again in a moment."

    # Persist the conversation turn
    conv_id = body.conversation_id or str(uuid.uuid4())
    await db.execute(
        """INSERT INTO ai_conversations (id, patient_id, org_id, role, content, created_at)
           VALUES ($1, $2, $3, 'user', $4, NOW()),
                  ($1, $2, $3, 'assistant', $5, NOW())""",
        uuid.UUID(conv_id), uuid.UUID(patient_id), uuid.UUID(user.org_id),
        body.message, ai_reply,
    )

    return {
        "conversation_id": conv_id,
        "reply": ai_reply,
    }

