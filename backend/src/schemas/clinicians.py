from pydantic import BaseModel


class ClinicianOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    active: bool
    patient_count: int
