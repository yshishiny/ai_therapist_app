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
    phone: str | None = None
    email: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    consent_ai_analysis: bool = False
    # How this record arrived and who added it. BULK_UPLOAD / MANUAL / SEED /
    # SYSTEM -- a seeded demo record must be distinguishable from a real one.
    source: str | None = None
    created_by: str | None = None
    source_detail: str | None = None
    wellbeing_status: str | None = None


class PatientListOut(BaseModel):
    """Paginated envelope for GET /patients.

    `total` is a COUNT over the same org/therapist filters as `items`, NOT the
    length of `items` -- without it a client cannot tell "50 patients, that's
    all" from "50 patients, page one of nine", which is exactly the bug a bare
    array produced.
    """

    items: list[PatientOut]
    total: int
    limit: int
    offset: int


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
    name: str | None = None
    # dob must stay a `date` (not `str`): update_patient passes these values
    # straight to asyncpg, which rejects a string for a DATE column.
    dob: date | None = None
    gender: str | None = None
    diagnosis: str | None = None
    phone: str | None = None
    email: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    consent_ai_analysis: bool | None = None
    wellbeing_status: str | None = None


class PatientBulkRowError(BaseModel):
    row: int
    error: str


class PatientBulkUploadSummaryOut(BaseModel):
    created: int
    failed: int
    errors: list[PatientBulkRowError]
