from datetime import datetime

from pydantic import BaseModel


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
    diagnosis: str = ''
    risk: str = 'Low'
    status: str = 'Active'
    phone: str | None = None
    email: str | None = None
    dob: str | None = None
