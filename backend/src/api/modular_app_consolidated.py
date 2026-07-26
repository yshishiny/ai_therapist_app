import os

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

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

_allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware (Order: Outer to Inner)
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    import uuid
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    import time, json
    # Simple static state for demo/scaffold (should be in separate service in prod)
    if not hasattr(app.state, "rate_limit_counts"):
        app.state.rate_limit_counts = {}
        app.state.last_reset = time.time()
        
    now = time.time()
    if now - app.state.last_reset > 60:
        app.state.rate_limit_counts.clear()
        app.state.last_reset = now
            
    client_ip = request.client.host if request.client else "127.0.0.1"
    current_count = app.state.rate_limit_counts.get(client_ip, 0)
    
    if current_count >= 200: # requests_per_minute
        return Response(
            content=json.dumps({"detail": "Rate limit exceeded."}),
            status_code=429,
            media_type="application/json"
        )
        
    app.state.rate_limit_counts[client_ip] = current_count + 1
    return await call_next(request)

@app.middleware("http")
async def structured_logging_middleware(request: Request, call_next):
    import time, json, logging
    logger = logging.getLogger("ai_therapist_app")
    start_time = time.perf_counter()
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    
    logger.info(json.dumps({
        "event": "request_started",
        "method": request.method,
        "path": request.url.path,
        "correlation_id": correlation_id
    }))
    
    try:
        response = await call_next(request)
        duration = time.perf_counter() - start_time
        logger.info(json.dumps({
            "event": "request_completed",
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "correlation_id": correlation_id
        }))
        return response
    except Exception as e:
        duration = time.perf_counter() - start_time
        logger.error(json.dumps({
            "event": "request_failed",
            "error": str(e),
            "duration_ms": round(duration * 1000, 2),
            "correlation_id": correlation_id
        }))
        raise e

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
