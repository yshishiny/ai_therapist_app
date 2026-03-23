from datetime import datetime

from pydantic import BaseModel


class AssessmentResultOut(BaseModel):
    id: str
    patient_id: str
    assessment_id: str
    raw_score: int
    severity: str
    interpretation: str
    created_at: datetime


class SubmitAssessmentIn(BaseModel):
    patient_id: str
    assessment_id: str
    raw_score: int
    severity: str
    interpretation: str
    answers: dict[str, int]
