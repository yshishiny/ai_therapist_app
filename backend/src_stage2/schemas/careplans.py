from datetime import datetime

from pydantic import BaseModel


class CarePlanOut(BaseModel):
    id: str
    patient_id: str
    status: str
    main_track: str | None
    goals: list | None
    created_at: datetime


class CarePlanIn(BaseModel):
    main_track: str | None = None
    goals: list | None = None
    status: str = 'DRAFT'
