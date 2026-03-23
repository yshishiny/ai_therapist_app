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
