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


class SessionOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    clinician_id: str | None = None
    status: str
    scheduled_at: datetime
    duration_minutes: int | None = None
    assessments: list[SessionAssessmentOut] = []
