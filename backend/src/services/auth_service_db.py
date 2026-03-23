from backend.src.repositories.auth_repository_db_real import AuthRepositoryDbReal
from backend.src.schemas.auth import LoginRequest, RefreshRequest


class AuthServiceDb:
    def __init__(self, repository: AuthRepositoryDbReal):
        self.repository = repository

    async def login_lookup(self, body: LoginRequest) -> dict:
        clinician = await self.repository.find_clinician_by_email(str(body.email))
        patient = await self.repository.find_patient_user_by_email(str(body.email))
        return {
            'email': str(body.email),
            'clinician_found': clinician is not None,
            'patient_found': patient is not None,
        }

    async def refresh_lookup(self, body: RefreshRequest) -> dict:
        return {
            'refresh_token_present': bool(body.refresh_token),
        }
