from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SessionCreateIn(BaseModel):
    patient_id: str
    template_keys: list[str] = []
    # The booking this consultation is being held under. Optional: a clinician
    # can start an unscheduled session (a walk-in, a crisis call) and there is
    # no appointment to point at. When it IS supplied the session inherits the
    # booking's scheduled time and length, so "when was this meant to happen"
    # comes from the calendar rather than from whenever the button was pressed.
    appointment_id: str | None = None


class SessionAssessmentOut(BaseModel):
    template_key: str
    name: str
    name_ar: str | None = None
    definition_json: dict[str, Any] | None = None
    delivery: str | None = None
    completed: bool = False
    # True when the key cannot be resolved for THIS clinician -- the instrument
    # was unpublished, deleted, or is owner-scoped to someone else since the
    # session was created. Previously such a key silently produced an
    # assessment with no questions: the clinician saw a blank step, could
    # answer nothing, and nothing was ever saved, with no explanation.
    unavailable: bool = False
    unavailable_reason: str | None = None


class SessionRecentNoteOut(BaseModel):
    """A previous note, shown to the clinician during the consultation.

    The session screen administered assessments and showed no history at all,
    so the clinician had to leave the session to remember what happened last
    time. Trimmed to the fields that are actually read at a glance -- the full
    note is still available from GET /patients/{id}/sessions.
    """

    id: str
    created_at: datetime
    subjective: str | None = None
    plan: str | None = None
    free_text: str | None = None
    therapist_approved: bool = False


class SessionRecentAssessmentOut(BaseModel):
    """A previous scored instrument, for comparison against today's score."""

    assessment_id: str
    raw_score: int | None = None
    severity: str | None = None
    flagged: bool = False
    created_at: datetime


class NextAppointmentIn(BaseModel):
    """The follow-up booked at the end of the session.

    Booking the next appointment is the last thing that happens in the room,
    and until now it could not happen there at all.
    """

    start_time: datetime
    end_time: datetime
    appointment_type: str | None = None
    location: str | None = None


class SessionCompleteIn(BaseModel):
    # Explicit elapsed time, when the client has been timing the consultation
    # itself. Omitted, the server derives it from started_at -> ended_at.
    # Bounded: a negative duration is not a duration, and a session longer than
    # a day is a clock bug or a client that forgot to call complete.
    duration_minutes: int | None = Field(default=None, ge=0, le=1440)
    next_appointment: NextAppointmentIn | None = None


class SessionOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    clinician_id: str | None = None
    status: str
    scheduled_at: datetime
    duration_minutes: int | None = None
    # When the consultation really started and ended, as opposed to when it was
    # booked to. Null on sessions created before these were recorded.
    started_at: datetime | None = None
    ended_at: datetime | None = None
    # The booking this session was held under, and the follow-up booked at the
    # end of it -- the chain of care, navigable in both directions.
    appointment_id: str | None = None
    next_appointment_id: str | None = None
    assessments: list[SessionAssessmentOut] = []
    recent_notes: list[SessionRecentNoteOut] = []
    recent_assessments: list[SessionRecentAssessmentOut] = []
