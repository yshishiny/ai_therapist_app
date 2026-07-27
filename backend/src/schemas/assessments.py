from datetime import datetime

from pydantic import BaseModel


class RiskFlagOut(BaseModel):
    flag: str | None = None
    risk_level: str | None = None
    message: str | None = None


class AssessmentResultOut(BaseModel):
    id: str
    patient_id: str
    assessment_id: str
    raw_score: int | None = None
    subscale_scores: dict[str, float] | None = None
    severity: str | None = None
    interpretation: str | None = None
    flagged: bool = False
    risk_flags: list[RiskFlagOut] = []
    created_at: datetime


class SubmitAssessmentIn(BaseModel):
    template_id: str
    answers: dict[str, int | str]
    session_id: str | None = None
