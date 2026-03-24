from datetime import datetime

from pydantic import BaseModel


class ResourceOut(BaseModel):
    id: str
    title: str
    author: str | None
    category: str
    description: str | None
    file_url: str | None
    created_at: datetime


class ContactOut(BaseModel):
    id: str
    full_name: str
    email: str | None
    phone: str | None
    role: str
    organisation: str | None


class ResourceIn(BaseModel):
    title: str
    author: str | None = None
    description: str | None = None
    category: str = 'BOOK'
    file_url: str | None = None
    tags: list = []


class ContactIn(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    role: str = 'REFERRER'
    organisation: str | None = None
    notes: str | None = None


class AssessmentQuestionIn(BaseModel):
    assessment_id: str
    question_index: int
    question_text: str
    response_type: str = 'LIKERT'
    options: list | None = None
    reverse_scored: bool = False


class AssessmentQuestionOut(BaseModel):
    id: str
    assessment_id: str
    question_index: int
    question_text: str
    response_type: str
    options: list | None
