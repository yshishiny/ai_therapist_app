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
        assessments.append(
            {
                "template_key": key,
                "name": tmpl["name"] if tmpl else key,
                "name_ar": tmpl.get("name_ar") if tmpl else None,
                "definition_json": tmpl["definition_json"] if tmpl else None,
                "delivery": tmpl["delivery"] if tmpl else None,
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
