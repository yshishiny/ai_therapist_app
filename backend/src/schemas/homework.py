from datetime import datetime

from pydantic import BaseModel


class HomeworkOut(BaseModel):
    id: str
    patient_id: str
    careplan_phase_id: str | None = None
    title: str
    description: str | None = None
    instructions: str | None
    task_type: str | None = None
    due_date: str | None
    status: str
    patient_feedback: dict | None = None
    therapist_notes: str | None = None
    assigned_at: datetime | None = None
    completed_at: datetime | None = None


class HomeworkIn(BaseModel):
    title: str
    instructions: str | None = None
    due_date: str | None = None


class HomeworkFeedbackIn(BaseModel):
    completionPercentage: int = 0
    difficultyRating: int = 3
    helpfulnessRating: int = 3
    barriers: list[str] = []
    additionalComments: str = ''
