from backend.src.schemas.auth import LoginRequest, RefreshRequest


class AuthService:
    async def login(self, body: LoginRequest) -> dict:
        return {'status': 'not_implemented', 'module': 'auth_service', 'action': 'login'}

    async def refresh(self, body: RefreshRequest) -> dict:
        return {'status': 'not_implemented', 'module': 'auth_service', 'action': 'refresh'}
