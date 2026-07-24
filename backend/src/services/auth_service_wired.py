from fastapi import HTTPException, status
from auth import (
    create_token_pair,
    verify_password,
    _decode,
    Role,
)
from backend.src.repositories.auth_repository import AuthRepository
from backend.src.schemas.auth import LoginRequest, RefreshRequest


class AuthServiceWired:
    def __init__(self, repository: AuthRepository | None = None):
        self.repository = repository or AuthRepository()

    async def login(self, body: LoginRequest) -> dict:
        """Authenticate user by email/password, return JWT token pair."""
        clinician = await self.repository.find_clinician_by_email(str(body.email))
        patient = await self.repository.find_patient_user_by_email(str(body.email))

        # Determine which account to use
        user_data = None
        role = None

        if clinician and verify_password(body.password, clinician['password_hash']):
            user_data = clinician
            role = Role.CLINICIAN
        elif patient and verify_password(body.password, patient['password_hash']):
            user_data = patient
            role = Role.PATIENT
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        # Generate JWT tokens
        tokens = create_token_pair(
            user_id=str(user_data['id']),
            role=role,
            org_id=str(user_data['org_id']),
        )

        return {
            'access_token': tokens.access_token,
            'refresh_token': tokens.refresh_token,
            'token_type': tokens.token_type,
        }

    async def refresh(self, body: RefreshRequest) -> dict:
        """Validate refresh token and issue new access token."""
        try:
            payload = _decode(body.refresh_token, 'refresh')
        except HTTPException as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            ) from e

        # Verify user still exists and is active
        if payload.role == Role.CLINICIAN:
            user = await self.repository.find_clinician_account(payload.sub)
        else:
            user = await self.repository.find_patient_account(payload.sub)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or inactive.",
            )

        # Issue new access token (same refresh token)
        tokens = create_token_pair(
            user_id=payload.sub,
            role=payload.role,
            org_id=payload.org_id,
        )

        return {
            'access_token': tokens.access_token,
            'refresh_token': tokens.refresh_token,
            'token_type': tokens.token_type,
        }

    async def logout(self, token_payload) -> dict:
        """Revoke access token (in production, add to token blacklist)."""
        from auth import revoke_token
        revoke_token(token_payload.jti)
        return {'status': 'success', 'message': 'Logged out successfully.'}
