from fastapi import FastAPI

from backend.src.api.routes.auth_db_wired import router as auth_router
from backend.src.api.routes.patients_db_wired import router as patients_router

app = FastAPI(title='AI Therapist API Modular DB Wired', version='0.5.0')
app.include_router(auth_router)
app.include_router(patients_router)


@app.get('/health')
async def health():
    return {'status': 'ok', 'mode': 'modular-db-wired'}
