from datetime import date

from fastapi import HTTPException, status

from backend.auth import Role, TokenPair, _decode, create_token_pair, hash_password, verify_password
from backend.src.repositories.auth_repository_db_real import AuthRepositoryDbReal
from backend.src.schemas.auth import LoginRequest, PatientRegisterRequest, RefreshRequest


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
