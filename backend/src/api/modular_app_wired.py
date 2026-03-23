from fastapi import FastAPI

from backend.src.api.routes.auth_wired import router as auth_router
from backend.src.api.routes.patients_wired import router as patients_router

app = FastAPI(title='AI Therapist API Modular Wired', version='0.3.0')
app.include_router(auth_router)
app.include_router(patients_router)


@app.get('/health')
async def health():
    return {'status': 'ok', 'mode': 'modular-wired-routes'}
