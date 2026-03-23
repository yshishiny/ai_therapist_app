from fastapi import APIRouter

router = APIRouter(prefix='/patients', tags=['patients'])


@router.get('/health')
async def patients_health():
    return {'status': 'ok', 'module': 'patients'}
