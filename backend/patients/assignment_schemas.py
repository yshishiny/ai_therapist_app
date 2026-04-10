from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class PatientClinicianAssignmentCreateIn(BaseModel):
    patient_id: UUID
    clinician_id: UUID
    is_primary: bool = True


class PatientClinicianAssignmentPatchIn(BaseModel):
    status: Literal["ACTIVE", "ENDED"]
    is_primary: bool | None = None


class PatientClinicianAssignmentOut(BaseModel):
    id: UUID
    org_id: UUID
    patient_id: UUID
    clinician_id: UUID
    is_primary: bool
    status: str
    assigned_at: datetime
    ended_at: datetime | None = None
