from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class PatientRegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    gender: str | None = None
    dob: str | None = None
