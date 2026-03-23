from fastapi import FastAPI

from backend.src.api.routes.auth import router as auth_router
from backend.src.api.routes.patients import router as patients_router

app = FastAPI(title='AI Therapist API Modular', version='0.2.0')
app.include_router(auth_router)
app.include_router(patients_router)


@app.get('/health')
async def health():
    return {'status': 'ok', 'mode': 'modular-wired'}
