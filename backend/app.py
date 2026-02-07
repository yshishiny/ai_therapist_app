"""AI Therapist Backend API"""
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import asyncpg
import uuid

app = FastAPI(title="AI Therapist API", version="0.1.0")

DATABASE_URL = os.getenv("DATABASE_URL")

# --- Models ---

class PatientCreate(BaseModel):
    full_name: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class Patient(PatientCreate):
    id: uuid.UUID
    status: str = "ACTIVE"
    created_at: Optional[datetime] = None

class AssessmentResult(BaseModel):
    patient_id: uuid.UUID
    template_id: str
    raw_answers: dict
    score_total: int
    severity_band: str

# --- Startup ---

@app.on_event("startup")
async def startup():
    if not DATABASE_URL:
        print("WARNING: DATABASE_URL not set!")
        return
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        await conn.close()
        print("Database connection successful.")
    except Exception as e:
        print(f"Database connection failed: {e}")

# --- Endpoints ---

@app.get("/")
def root():
    return {"status": "ok", "service": "AI Therapist API", "version": "0.1.0"}

@app.get("/health")
def health():
    return {"healthy": True}

@app.get("/patients", response_model=List[Patient])
async def list_patients(status: str = "ACTIVE", limit: int = 50):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch(
            "SELECT id, full_name, dob, gender, phone, email, status, created_at FROM patients WHERE status = $1 ORDER BY full_name LIMIT $2",
            status, limit
        )
        return [Patient(**dict(r)) for r in rows]
    finally:
        await conn.close()

@app.post("/patients", response_model=Patient)
async def create_patient(patient: PatientCreate):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO patients (therapist_id, full_name, dob, gender, phone, email)
            VALUES ('default', $1, $2, $3, $4, $5)
            RETURNING id, full_name, dob, gender, phone, email, status, created_at
            """,
            patient.full_name, patient.dob, patient.gender, patient.phone, patient.email
        )
        return Patient(**dict(row))
    finally:
        await conn.close()

@app.get("/patients/{patient_id}")
async def get_patient(patient_id: uuid.UUID):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        row = await conn.fetchrow("SELECT * FROM patients WHERE id = $1", patient_id)
        if not row:
            raise HTTPException(status_code=404, detail="Patient not found")
        return dict(row)
    finally:
        await conn.close()

@app.get("/assessments/templates")
async def list_templates():
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        rows = await conn.fetch("SELECT * FROM assessment_templates")
        return [dict(r) for r in rows]
    finally:
        await conn.close()

@app.post("/assessments")
async def submit_assessment(result: AssessmentResult):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        import json
        row = await conn.fetchrow(
            """
            INSERT INTO assessment_instances (patient_id, template_id, raw_answers, score_total, severity_band)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, patient_id, template_id, taken_at, score_total, severity_band
            """,
            result.patient_id, result.template_id, json.dumps(result.raw_answers), 
            result.score_total, result.severity_band
        )
        return dict(row)
    finally:
        await conn.close()

@app.get("/dashboard")
async def dashboard():
    """Quick dashboard stats"""
    if not DATABASE_URL:
        return {"error": "Database not configured"}
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        active = await conn.fetchval("SELECT COUNT(*) FROM patients WHERE status = 'ACTIVE'")
        today_appts = await conn.fetchval(
            "SELECT COUNT(*) FROM appointments WHERE DATE(start_time) = CURRENT_DATE"
        )
        return {
            "active_patients": active or 0,
            "today_appointments": today_appts or 0
        }
    finally:
        await conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
