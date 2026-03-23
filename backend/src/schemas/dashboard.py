from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    active_cases: int
    new_this_month: int
    risk_alerts: int
    high_priority: int
    assessments_completed: int
    sessions_today: int
    sessions_remaining: int
