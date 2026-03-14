"""AI Therapist Backend API"""
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import asyncpg
import uuid

from contextlib import asynccontextmanager

# --- Graceful Shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic can go here
    print("Starting up AI Therapist API...")
    yield
    # Shutdown logic goes here
    print("Shutting down gracefully...")

app = FastAPI(title="AI Therapist API", version="0.1.0", lifespan=lifespan)

DATABASE_URL = os.getenv("DATABASE_URL")

# --- Health Check ---
@app.get("/health")
async def health_check():
    """Returns 200 OK for Railway health monitoring."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

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
    score_total: Optional[int] = None
    severity_band: Optional[str] = None

# ... (Startup and other endpoints remain unchanged) ...

@app.post("/assessments")
async def submit_assessment(result: AssessmentResult):
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Fetch template rules
        template = await conn.fetchrow(
            "SELECT scoring_rules FROM assessment_templates WHERE id = $1", 
            result.template_id
        )
        if not template:
            raise HTTPException(status_code=404, detail="Assessment template not found")
        
        import json
        rules = json.loads(template['scoring_rules'])
        
        # Calculate Score
        total_score = 0
        
        # Special handling for different templates based on ID or simple sum
        # This is a basic implementation for PHQ-9/GAD-7 style sum
        if result.template_id in ['phq9', 'gad7']:
            for key, value in result.raw_answers.items():
                if isinstance(value, int):
                    total_score += value
        # PSS-10 likely needs reverse scoring logic, keeping simple for MVP-1
        elif result.template_id == 'pss10':
             # Placeholder for complex logic if needed
             for key, value in result.raw_answers.items():
                if isinstance(value, int):
                    total_score += value

        # Determine Severity
        severity = "Unknown"
        if "bands" in rules:
            for band in rules["bands"]:
                if band["min"] <= total_score <= band["max"]:
                    severity = band["label"]
                    break

        row = await conn.fetchrow(
            """
            INSERT INTO assessment_instances (patient_id, template_id, raw_answers, score_total, severity_band)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, patient_id, template_id, taken_at, score_total, severity_band
            """,
            result.patient_id, result.template_id, json.dumps(result.raw_answers), 
            total_score, severity
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
    # Make production safe: do not hardcode localhost
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
