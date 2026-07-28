from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException

from backend.assessment_admin.service import list_available_templates
from backend.auth import Role, TokenPayload, require_role
from backend.core.dependencies_access import DB
from backend.clinician_sessions.schemas import SessionCompleteIn, SessionCreateIn, SessionOut
from backend.src.repositories.appointment_repository_db_real import AppointmentRepositoryDbReal
from backend.src.schemas.appointments import AppointmentIn
from backend.src.services.appointment_service_db import AppointmentServiceDb

SessionUser = Annotated[TokenPayload, require_role(Role.ADMIN, Role.SUPERVISOR, Role.CLINICIAN)]

router = APIRouter(tags=["clinician-sessions"])

# How much history the consultation screen carries. Five is what fits on the
# screen beside the live session without the clinician scrolling; the full
# record stays available from the patient's own endpoints.
_HISTORY_LIMIT = 5


def _question_count(tmpl: dict) -> int:
    """How many items an instrument actually has.

    `definition_json` is `{}` on several legacy templates, so "the template
    exists" is not the same as "the template can be administered".
    """
    definition = tmpl.get("definition_json") or {}
    questions = definition.get("questions") or []
    return len(questions)


def _str_or_none(value: Any) -> str | None:
    """UUID -> str, preserving null.

    asyncpg hands back uuid.UUID for every UUID column and every one of them
    lands in a `str`-typed Pydantic field. Returning the raw UUID has produced
    the same 500 in this codebase five times.
    """
    return str(value) if value is not None else None


async def _recent_notes(db, patient_id) -> list[dict]:
    """The patient's last few session notes, newest first.

    The session screen showed no history whatsoever: the clinician had to leave
    the consultation to recall what happened last time.
    """
    rows = await db.fetch(
        """
        SELECT id, created_at, subjective, plan, free_text, therapist_approved
        FROM session_notes
        WHERE patient_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        """,
        patient_id,
        _HISTORY_LIMIT,
    )
    return [
        {
            "id": str(row["id"]),
            "created_at": row["created_at"],
            "subjective": row["subjective"],
            "plan": row["plan"],
            "free_text": row["free_text"],
            "therapist_approved": bool(row["therapist_approved"]),
        }
        for row in rows
    ]


async def _recent_assessments(db, patient_id, org_id: str) -> list[dict]:
    """The patient's last few SCORED instruments, newest first.

    `score_total IS NOT NULL` on purpose: an abandoned or unscorable instance
    has nothing to compare today's score against, and listing it beside real
    results invites reading a blank as a zero.

    Scoped through the patients join like every other assessment read, so a
    session row whose patient somehow sits in another org cannot leak results.
    """
    rows = await db.fetch(
        """
        SELECT ai.template_id AS assessment_id,
               ai.score_total  AS raw_score,
               ai.severity_band AS severity,
               ai.flagged,
               ai.taken_at     AS created_at
        FROM assessment_instances ai
        JOIN patients p ON p.id = ai.patient_id
        WHERE ai.patient_id = $1
          AND p.org_id = $2
          AND ai.score_total IS NOT NULL
        ORDER BY ai.taken_at DESC
        LIMIT $3
        """,
        patient_id,
        uuid.UUID(org_id),
        _HISTORY_LIMIT,
    )
    return [
        {
            "assessment_id": row["assessment_id"],
            "raw_score": row["raw_score"],
            "severity": row["severity"],
            "flagged": bool(row["flagged"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


async def _build_session_out(db, session_row, user: TokenPayload) -> dict:
    patient = await db.fetchrow(
        "SELECT id, name FROM patients WHERE id = $1 AND org_id = $2",
        session_row["patient_id"], uuid.UUID(user.org_id),
    )
    templates = await list_available_templates(
        db, org_id=user.org_id, requesting_user_id=user.sub, requesting_user_role=user.role.value,
    )
    by_key = {t["id"]: t for t in templates}

    completed_keys = {
        row["template_id"]
        for row in await db.fetch(
            "SELECT DISTINCT template_id FROM assessment_instances WHERE session_id = $1",
            session_row["id"],
        )
    }

    requested_keys = (session_row["summary_snippet"] or "").split(",") if session_row["summary_snippet"] else []
    assessments = []
    for key in requested_keys:
        if not key:
            continue
        tmpl = by_key.get(key)
        if tmpl is None:
            # Say so instead of returning an assessment with no questions. A
            # blank step that silently saves nothing is worse than an error:
            # the clinician believes the assessment was administered.
            assessments.append(
                {
                    "template_key": key,
                    "name": key,
                    "completed": key in completed_keys,
                    "unavailable": True,
                    "unavailable_reason": (
                        "This instrument is no longer available to you. It may have been "
                        "unpublished, or it belongs to another clinician's private library."
                    ),
                }
            )
            continue
        if not _question_count(tmpl) and key not in completed_keys:
            # Existing sessions created before the guard above can still carry
            # a contentless instrument. Surface it rather than showing a step
            # with nothing in it.
            assessments.append(
                {
                    "template_key": key,
                    "name": tmpl["name"],
                    "name_ar": tmpl.get("name_ar"),
                    "completed": False,
                    "unavailable": True,
                    "unavailable_reason": (
                        "This instrument has no questions yet, so it cannot be administered. "
                        "Nothing has been recorded for it."
                    ),
                }
            )
            continue
        assessments.append(
            {
                "template_key": key,
                "name": tmpl["name"],
                "name_ar": tmpl.get("name_ar"),
                "definition_json": tmpl["definition_json"],
                "delivery": tmpl["delivery"],
                "completed": key in completed_keys,
            }
        )

    return {
        "id": str(session_row["id"]),
        "patient_id": str(session_row["patient_id"]),
        "patient_name": patient["name"] if patient else "Unknown patient",
        "clinician_id": _str_or_none(session_row["clinician_id"]),
        "status": session_row["status"],
        "scheduled_at": session_row["scheduled_at"],
        "duration_minutes": session_row["duration_minutes"],
        # .get(): these columns arrive with migration 020. Reading them
        # defensively means a backend that is ahead of its database degrades to
        # "not recorded" instead of a KeyError on every session screen.
        "started_at": session_row.get("started_at"),
        "ended_at": session_row.get("ended_at"),
        "appointment_id": _str_or_none(session_row.get("appointment_id")),
        "next_appointment_id": _str_or_none(session_row.get("next_appointment_id")),
        "assessments": assessments,
        "recent_notes": await _recent_notes(db, session_row["patient_id"]),
        "recent_assessments": await _recent_assessments(db, session_row["patient_id"], user.org_id),
    }


async def _load_appointment(db, appointment_id: str, org_id: str) -> Any:
    """Fetch an appointment the caller is entitled to see.

    Org scoping mirrors AppointmentRepositoryDbReal: `appointments.org_id` is
    the real tenant column, with a fallback through the patient for any row the
    018 backfill could not reach.
    """
    try:
        appointment_uuid = uuid.UUID(appointment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="appointment_id is not a valid id.") from exc

    return await db.fetchrow(
        """
        SELECT a.id, a.patient_id, a.start_time, a.end_time
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        WHERE a.id = $1
          AND (a.org_id = $2 OR (a.org_id IS NULL AND p.org_id = $2))
        """,
        appointment_uuid,
        uuid.UUID(org_id),
    )


@router.post("/clinician-sessions", response_model=SessionOut, status_code=201)
async def create_session(body: SessionCreateIn, user: SessionUser, db: DB):
    patient = await db.fetchval(
        "SELECT 1 FROM patients WHERE id = $1 AND org_id = $2",
        uuid.UUID(body.patient_id), uuid.UUID(user.org_id),
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Validate the requested instruments up front. Without this an unknown key
    # (a typo, an unpublished draft, or an instrument private to another
    # clinician) was accepted silently, then rendered as a step with no
    # questions -- so the clinician could answer nothing and nothing was saved.
    if body.template_keys:
        available = await list_available_templates(
            db,
            org_id=user.org_id,
            requesting_user_id=user.sub,
            requesting_user_role=user.role.value,
        )
        by_key = {t["id"]: t for t in available}

        unknown = [k for k in body.template_keys if k and k not in by_key]
        if unknown:
            raise HTTPException(
                status_code=400,
                detail=(
                    "These assessments are not available to you: "
                    + ", ".join(unknown)
                    + ". They may be unpublished drafts, or private to another clinician."
                ),
            )

        # An instrument can exist, be published and still carry no items --
        # several legacy templates have an empty definition_json. Selecting one
        # produced a step with nothing to answer, so nothing was ever submitted
        # and the clinician had no idea the assessment had not been recorded.
        # Refuse it at the door rather than failing silently later.
        empty = [
            k
            for k in body.template_keys
            if k in by_key and not _question_count(by_key[k])
        ]
        if empty:
            names = ", ".join(by_key[k]["name"] for k in empty)
            raise HTTPException(
                status_code=400,
                detail=(
                    f"These assessments have no questions yet and cannot be administered: {names}. "
                    "Add their items in the assessment library first."
                ),
            )

    now = datetime.now(timezone.utc)
    # Unscheduled session: it is happening now, for the default hour-ish slot.
    scheduled_at = now
    duration_minutes = 50
    appointment_uuid: uuid.UUID | None = None

    if body.appointment_id:
        appointment = await _load_appointment(db, body.appointment_id, user.org_id)
        if appointment is None:
            raise HTTPException(status_code=404, detail="Appointment not found.")
        if appointment["patient_id"] is None:
            raise HTTPException(
                status_code=400,
                detail="That appointment is an admin or documentation block, not a patient booking.",
            )
        if str(appointment["patient_id"]) != str(uuid.UUID(body.patient_id)):
            # Attaching a session to another patient's booking would put this
            # consultation in the wrong person's record. Refuse loudly.
            raise HTTPException(
                status_code=400,
                detail="That appointment belongs to a different patient.",
            )
        appointment_uuid = appointment["id"]
        # The booking is the authority on when the session was meant to happen
        # and how long it was meant to run; `started_at` below records when it
        # actually began.
        scheduled_at = appointment["start_time"]
        booked_minutes = round(
            (appointment["end_time"] - appointment["start_time"]).total_seconds() / 60
        )
        if booked_minutes > 0:
            duration_minutes = booked_minutes

    session_id = uuid.uuid4()
    # summary_snippet doubles as the requested-assessment-keys list for this
    # lightweight MVP rather than adding a join table for a start-of-session
    # selection that's superseded by real assessment_instances once taken.
    await db.execute(
        """
        INSERT INTO sessions (id, patient_id, org_id, clinician_id, appointment_id, session_type,
                              scheduled_at, duration_minutes, status, summary_snippet,
                              started_at, created_at)
        VALUES ($1, $2, $3, $4, $5, 'Individual', $6, $7, 'in_progress', $8, $9, $9)
        """,
        session_id, uuid.UUID(body.patient_id), uuid.UUID(user.org_id), uuid.UUID(user.sub),
        appointment_uuid, scheduled_at, duration_minutes, ",".join(body.template_keys), now,
    )
    row = await db.fetchrow("SELECT * FROM sessions WHERE id = $1", session_id)
    return await _build_session_out(db, row, user)


@router.get("/clinician-sessions/{session_id}", response_model=SessionOut)
async def get_session(session_id: str, user: SessionUser, db: DB):
    row = await db.fetchrow(
        "SELECT * FROM sessions WHERE id = $1 AND org_id = $2",
        uuid.UUID(session_id), uuid.UUID(user.org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found.")
    return await _build_session_out(db, row, user)


@router.post("/clinician-sessions/{session_id}/complete", response_model=SessionOut)
async def complete_session(
    session_id: str,
    user: SessionUser,
    db: DB,
    body: SessionCompleteIn | None = None,
):
    """End the consultation: record when it finished, how long it ran, and --
    if the clinician booked one in the room -- the follow-up appointment.

    The body is optional so the previous no-body callers keep working.
    """
    row = await db.fetchrow(
        "SELECT * FROM sessions WHERE id = $1 AND org_id = $2",
        uuid.UUID(session_id), uuid.UUID(user.org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found.")

    next_appointment = body.next_appointment if body else None

    if next_appointment is not None and row.get("next_appointment_id"):
        # Completing twice used to be harmless. Now it would book a second
        # follow-up on a double-tap or a retried request, so refuse instead.
        raise HTTPException(
            status_code=409,
            detail="A follow-up appointment has already been booked for this session.",
        )

    now = datetime.now(timezone.utc)
    # Idempotent: a session completed earlier keeps the end time it was
    # actually finished at rather than being restamped by a repeat call.
    ended_at = row.get("ended_at") or now
    started_at = row.get("started_at")

    if body is not None and body.duration_minutes is not None:
        duration_minutes = body.duration_minutes
    elif started_at is not None:
        # Elapsed wall-clock time of the consultation. max(0, ...) guards the
        # case where started_at is somehow later than now (clock skew between
        # app servers); a negative duration is never written.
        duration_minutes = max(0, round((ended_at - started_at).total_seconds() / 60))
    else:
        # No start recorded (a session created before migration 020) -- leave
        # the booked duration alone rather than inventing an elapsed time.
        duration_minutes = row["duration_minutes"]

    next_appointment_id: str | None = None
    if next_appointment is not None:
        if next_appointment.end_time <= next_appointment.start_time:
            raise HTTPException(
                status_code=400,
                detail="The follow-up appointment must end after it starts.",
            )
        # Reuse the appointment service rather than hand-rolling an INSERT: it
        # owns patient-in-org validation, the appointment_type vocabulary and
        # writing org_id onto the row. Booked BEFORE the session is marked
        # complete, so a rejected booking cannot leave a completed session
        # whose follow-up silently never existed.
        appointment_service = AppointmentServiceDb(repository=AppointmentRepositoryDbReal(db=db))
        created = await appointment_service.create_appointment(
            body=AppointmentIn(
                patient_id=str(row["patient_id"]),
                start_time=next_appointment.start_time,
                end_time=next_appointment.end_time,
                location=next_appointment.location or "IN_PERSON",
                appointment_type=next_appointment.appointment_type,
            ),
            org_id=user.org_id,
            therapist_id=user.sub,
        )
        next_appointment_id = created["id"]

    await db.execute(
        """
        UPDATE sessions
        SET status = 'completed',
            ended_at = $1,
            duration_minutes = $2,
            next_appointment_id = COALESCE($3, next_appointment_id)
        WHERE id = $4
        """,
        ended_at,
        duration_minutes,
        uuid.UUID(next_appointment_id) if next_appointment_id else None,
        uuid.UUID(session_id),
    )
    row = await db.fetchrow("SELECT * FROM sessions WHERE id = $1", uuid.UUID(session_id))
    return await _build_session_out(db, row, user)
