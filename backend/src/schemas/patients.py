from datetime import date, datetime

from pydantic import BaseModel


class PatientOut(BaseModel):
    id: str
    name: str
    status: str
    risk: str
    diagnosis: str
    last_seen: datetime | None
    therapist_id: str | None = None
    dob: date | None = None
    gender: str | None = None


class PatientCreateIn(BaseModel):
    full_name: str
    gender: str | None = None
    diagnosis: str = ''
    risk: str = 'Low'
    status: str = 'Active'
    phone: str | None = None
    email: str | None = None
    dob: str | None = None


class PatientUpdateIn(BaseModel):
    therapist_id: str | None = None
    status: str | None = None
    risk: str | None = None


class PatientBulkRowError(BaseModel):
    row: int
    error: str


class PatientBulkUploadSummaryOut(BaseModel):
    created: int
    failed: int
    errors: list[PatientBulkRowError]
