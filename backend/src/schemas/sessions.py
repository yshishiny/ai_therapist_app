from datetime import datetime

from pydantic import BaseModel


class SessionNoteOut(BaseModel):
    id: str
    patient_id: str
    template: str
    subjective: str | None
    objective: str | None
    assessment: str | None
    plan: str | None
    free_text: str | None
    ai_draft_summary: str | None
    created_at: datetime


class SessionNoteIn(BaseModel):
    template: str = 'SOAP'
    subjective: str | None = None
    objective: str | None = None
    assessment: str | None = None
    plan: str | None = None
    free_text: str | None = None
    ai_draft_summary: str | None = None
