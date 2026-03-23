from backend.src.repositories.auth_repository import AuthRepository
from backend.src.schemas.auth import LoginRequest, RefreshRequest


class AuthServiceWired:
    def __init__(self, repository: AuthRepository | None = None):
        self.repository = repository or AuthRepository()

    async def login(self, body: LoginRequest) -> dict:
        clinician = await self.repository.find_clinician_by_email(str(body.email))
        patient = await self.repository.find_patient_user_by_email(str(body.email))
        return {
            'status': 'stubbed',
            'module': 'auth_service',
            'action': 'login',
            'email': str(body.email),
            'clinician_found': clinician is not None,
            'patient_found': patient is not None,
        }

    async def refresh(self, body: RefreshRequest) -> dict:
        return {
            'status': 'stubbed',
            'module': 'auth_service',
            'action': 'refresh',
            'refresh_token_present': bool(body.refresh_token),
        }
