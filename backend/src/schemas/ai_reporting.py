from pydantic import BaseModel


class ReportGenerationRequest(BaseModel):
    include_homework: bool = True
    include_assessments: bool = True
    include_sessions: bool = True


class AiChatMessageIn(BaseModel):
    message: str
    conversation_id: str | None = None
