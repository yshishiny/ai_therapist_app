from datetime import datetime

from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    active_cases: int
    new_this_month: int
    risk_alerts: int
    high_priority: int
    assessments_completed: int
    sessions_today: int
    sessions_remaining: int


class ScheduleItemOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    patient_risk: str
    start_time: datetime
    end_time: datetime
    location: str
    status: str


class NeedsReviewItemOut(BaseModel):
    patient_id: str
    patient_name: str
    instrument_name: str
    interpretation_text: str | None
    taken_at: datetime


class NoteDueItemOut(BaseModel):
    note_id: str
    patient_id: str
    patient_name: str
    created_at: datetime


class ClinicianDashboardOut(BaseModel):
    patients_count: int
    sessions_today_count: int
    notes_due_count: int
    today_schedule: list[ScheduleItemOut]
    needs_review: list[NeedsReviewItemOut]
    notes_due: list[NoteDueItemOut]
