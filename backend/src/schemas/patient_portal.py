from pydantic import BaseModel


class FcmTokenIn(BaseModel):
    fcm_token: str


class MoodLogIn(BaseModel):
    mood_score: int
    energy_score: int
    note: str | None = None
    emotions: list[str] = []


class HomeworkSubmitIn(BaseModel):
    completion_notes: str | None = None
    helpfulness_rating: int | None = None


class SessionRequestIn(BaseModel):
    preferred_date: str | None = None
    notes: str | None = None
