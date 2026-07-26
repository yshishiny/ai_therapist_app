import os
from datetime import date

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from backend.auth import Role, TokenPair, _decode, create_token_pair, hash_password, verify_password
from backend.src.repositories.auth_repository_db_real import AuthRepositoryDbReal
from backend.src.schemas.auth import LoginRequest, PatientRegisterRequest, RefreshRequest

# Comma-separated list of Google-account emails allowed to sign in / be
# auto-provisioned as admins. Set via env var; defaults to the platform owner.
_ALLOWED_GOOGLE_EMAILS = {
    e.strip().lower()
    for e in os.getenv("GOOGLE_SIGNIN_ALLOWED_EMAILS", "shishiny@gmail.com").split(",")
    if e.strip()
}


class AuthServiceDb:
    def __init__(self, repository: AuthRepositoryDbReal):
        self.repository = repository

    async def register_patient(self, body: PatientRegisterRequest) -> TokenPair:
        """Register a new patient and return tokens."""
        email = str(body.email)

        # Check if email already exists
        if await self.repository.patient_email_exists(email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        # Get default organisation
        org_id = await self.repository.get_default_org_id()
        if not org_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No organisation configured.",
            )

        # Parse date of birth if provided
        dob: date | None = None
        if body.dob:
            try:
                dob = date.fromisoformat(body.dob)
            except ValueError:
                dob = None

        # Register patient
        patient_id = await self.repository.register_patient(
            email=email,
            password_hash=hash_password(body.password),
            full_name=body.full_name,
            gender=body.gender,
            dob=dob,
            org_id=org_id,
        )

        # Return token pair
        return create_token_pair(
            user_id=patient_id,
            role=Role.PATIENT,
            org_id=org_id,
        )

    async def login_lookup(self, body: LoginRequest) -> TokenPair:
        clinician = await self.repository.find_clinician_by_email(str(body.email))
        if clinician and verify_password(body.password, clinician["password_hash"]):
            return create_token_pair(
                user_id=str(clinician["id"]),
                role=Role(clinician["role"]),
                org_id=str(clinician["org_id"]),
            )

        patient = await self.repository.find_patient_user_by_email(str(body.email))
        if patient and verify_password(body.password, patient["password_hash"]):
            return create_token_pair(
                user_id=str(patient["patient_id"]),
                role=Role.PATIENT,
                org_id=str(patient["org_id"]),
            )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    async def login_with_google(self, google_id_token_str: str) -> TokenPair:
        client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
        if not client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Google Sign-In is not configured on the server.",
            )

        try:
            claims = google_id_token.verify_oauth2_token(
                google_id_token_str, google_requests.Request(), client_id,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google sign-in token.",
            ) from exc

        email = (claims.get("email") or "").lower()
        if not email or not claims.get("email_verified"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google account email is not verified.",
            )

        if email not in _ALLOWED_GOOGLE_EMAILS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This Google account is not authorized for this application.",
            )

        clinician = await self.repository.find_or_create_admin_clinician(email)
        return create_token_pair(
            user_id=str(clinician["id"]),
            role=Role(clinician["role"]),
            org_id=str(clinician["org_id"]),
        )

    async def refresh_lookup(self, body: RefreshRequest) -> TokenPair:
        payload = _decode(body.refresh_token, "refresh")

        if payload.role == Role.PATIENT:
            patient = await self.repository.find_patient_account(payload.sub)
            if not patient:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Patient account not found or deactivated.",
                )
            return create_token_pair(
                user_id=payload.sub,
                role=Role.PATIENT,
                org_id=str(patient["org_id"]),
            )

        clinician = await self.repository.find_clinician_account(payload.sub)
        if not clinician:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or deactivated.",
            )
        return create_token_pair(
            user_id=payload.sub,
            role=Role(clinician["role"]),
            org_id=str(clinician["org_id"]),
        )
