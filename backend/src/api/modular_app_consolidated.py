from fastapi import FastAPI

from backend.src.api.routes.auth_db_wired import router as auth_router
from backend.src.api.routes.patients_db_wired import router as patients_router
from backend.src.api.routes.assessments_db_wired import router as assessments_router
from backend.src.api.routes.sessions_db_wired import router as sessions_router
from backend.src.api.routes.appointments_db_wired import router as appointments_router
from backend.src.api.routes.homework_db_wired import router as homework_router
from backend.src.api.routes.careplans_db_wired import router as careplans_router
from backend.src.api.routes.dashboard_db_wired import router as dashboard_router
from backend.src.api.routes.admin_db_wired import router as admin_router
from backend.src.api.routes.patient_portal_db_wired import router as portal_router
from backend.src.api.routes.ai_reporting_db_wired import router as ai_router
from backend.src.core.db import db_lifespan

app = FastAPI(
    title="AI Therapist API Modular Consolidated",
    version="0.8.0",
    lifespan=db_lifespan,
)
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(assessments_router)
app.include_router(sessions_router)
app.include_router(appointments_router)
app.include_router(homework_router)
app.include_router(careplans_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(portal_router)
app.include_router(ai_router)


@app.get('/health')
async def health():
    return {'status': 'ok', 'mode': 'modular-consolidated'}
