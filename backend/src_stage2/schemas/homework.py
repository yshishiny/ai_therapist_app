from pydantic import BaseModel


class HomeworkOut(BaseModel):
    id: str
    patient_id: str
    title: str
    instructions: str | None
    due_date: str | None
    status: str


class HomeworkIn(BaseModel):
    title: str
    instructions: str | None = None
    due_date: str | None = None
