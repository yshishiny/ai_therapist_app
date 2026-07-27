from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class SessionCreateIn(BaseModel):
    patient_id: str
    template_keys: list[str] = []


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


class SessionOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    clinician_id: str | None = None
    status: str
    scheduled_at: datetime
    duration_minutes: int | None = None
    assessments: list[SessionAssessmentOut] = []
