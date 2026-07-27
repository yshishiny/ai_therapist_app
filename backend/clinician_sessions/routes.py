from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, HTTPException

from backend.assessment_admin.service import list_available_templates
from backend.auth import Role, TokenPayload, require_role
from backend.core.dependencies_access import DB
from backend.clinician_sessions.schemas import SessionCreateIn, SessionOut

SessionUser = Annotated[TokenPayload, require_role(Role.ADMIN, Role.SUPERVISOR, Role.CLINICIAN)]

router = APIRouter(tags=["clinician-sessions"])


def _question_count(tmpl: dict) -> int:
    """How many items an instrument actually has.

    `definition_json` is `{}` on several legacy templates, so "the template
    exists" is not the same as "the template can be administered".
    """
    definition = tmpl.get("definition_json") or {}
    questions = definition.get("questions") or []
    return len(questions)


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
        "clinician_id": str(session_row["clinician_id"]) if session_row["clinician_id"] else None,
        "status": session_row["status"],
        "scheduled_at": session_row["scheduled_at"],
        "duration_minutes": session_row["duration_minutes"],
        "assessments": assessments,
    }


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

    session_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    # summary_snippet doubles as the requested-assessment-keys list for this
    # lightweight MVP rather than adding a join table for a start-of-session
    # selection that's superseded by real assessment_instances once taken.
    await db.execute(
        """
        INSERT INTO sessions (id, patient_id, org_id, clinician_id, session_type, scheduled_at, duration_minutes, status, summary_snippet, created_at)
        VALUES ($1, $2, $3, $4, 'Individual', $5, 50, 'in_progress', $6, $5)
        """,
        session_id, uuid.UUID(body.patient_id), uuid.UUID(user.org_id), uuid.UUID(user.sub),
        now, ",".join(body.template_keys),
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
async def complete_session(session_id: str, user: SessionUser, db: DB):
    row = await db.fetchrow(
        "SELECT * FROM sessions WHERE id = $1 AND org_id = $2",
        uuid.UUID(session_id), uuid.UUID(user.org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Session not found.")
    await db.execute("UPDATE sessions SET status = 'completed' WHERE id = $1", uuid.UUID(session_id))
    row = await db.fetchrow("SELECT * FROM sessions WHERE id = $1", uuid.UUID(session_id))
    return await _build_session_out(db, row, user)
