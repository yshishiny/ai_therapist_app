from datetime import datetime

from pydantic import BaseModel


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    start_time: datetime
    end_time: datetime
    location: str
    status: str
    meeting_link: str | None


class AppointmentIn(BaseModel):
    patient_id: str
    start_time: datetime
    end_time: datetime
    location: str = 'IN_PERSON'
    meeting_link: str | None = None
