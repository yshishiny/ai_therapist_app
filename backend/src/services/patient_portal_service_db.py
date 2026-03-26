import json
from datetime import datetime

from fastapi import HTTPException, status
from fastapi.encoders import jsonable_encoder

from backend.src.repositories.patient_portal_repository_db_real import PatientPortalRepositoryDbReal
from backend.src.schemas.patient_portal import HomeworkSubmitIn, MoodLogIn, SessionRequestIn


def _to_json(data) -> dict | list | None:
    """Convert database rows to JSON-serializable format."""
    if data is None:
        return None
    return jsonable_encoder(data)


class PatientPortalServiceDb:
    def __init__(self, repository: PatientPortalRepositoryDbReal):
        self.repository = repository

    async def register_fcm_token(self, patient_id: str, fcm_token: str) -> None:
        """Register FCM token for push notifications."""
        await self.repository.update_fcm_token(patient_id, fcm_token)

    async def get_profile(self, patient_id: str, org_id: str) -> dict:
        """Get patient profile."""
        profile = await self.repository.get_patient_profile(patient_id, org_id)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient profile not found.",
            )
        return _to_json(profile)

    async def log_mood(
        self,
        patient_id: str,
        org_id: str,
        body: MoodLogIn,
    ) -> dict:
        """Log a mood entry."""
        entry_id = await self.repository.create_mood_log(
            patient_id=patient_id,
            org_id=org_id,
            mood_score=body.mood_score,
            energy_score=body.energy_score,
            note=body.note,
            emotions=body.emotions,
        )
        return {"id": entry_id, "status": "logged"}

    async def get_mood_history(
        self,
        patient_id: str,
        org_id: str,
        days: int = 30,
    ) -> list[dict]:
        """Get mood history for the past N days."""
        rows = await self.repository.get_mood_history(patient_id, org_id, days)
        return _to_json(rows)

    async def get_assessments(self, patient_id: str) -> list[dict]:
        """Get all assessments for a patient."""
        rows = await self.repository.get_patient_assessments(patient_id)
        return _to_json(rows)

    async def get_homework(self, patient_id: str, org_id: str) -> list[dict]:
        """Get all homework tasks for a patient."""
        rows = await self.repository.get_patient_homework(patient_id, org_id)
        items = _to_json(rows)

        # Normalize status and parse feedback JSON
        for item in items:
            item["status"] = str(item.get("status", "")).lower()
            feedback = item.get("patient_feedback")
            if isinstance(feedback, str) and feedback:
                try:
                    item["patient_feedback"] = json.loads(feedback)
                except json.JSONDecodeError:
                    pass

        return items

    async def get_sessions(
        self,
        patient_id: str,
        org_id: str,
        upcoming_only: bool = False,
    ) -> list[dict]:
        """Get session history for a patient."""
        rows = await self.repository.get_patient_sessions(
            patient_id, org_id, upcoming_only
        )
        return _to_json(rows)

    async def request_session(
        self,
        patient_id: str,
        org_id: str,
        body: SessionRequestIn,
    ) -> dict:
        """Request a new therapy session."""
        scheduled_at = None
        if body.preferred_date:
            try:
                scheduled_at = datetime.strptime(body.preferred_date, "%Y-%m-%d")
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="preferred_date must be YYYY-MM-DD",
                ) from exc

        result = await self.repository.create_session_request(
            patient_id=patient_id,
            org_id=org_id,
            scheduled_at=scheduled_at,
            notes=body.notes,
        )
        return {
            "id": str(result["id"]),
            "status": result["status"],
            "scheduled_at": result["scheduled_at"],
        }

    async def submit_homework(
        self,
        task_id: str,
        patient_id: str,
        org_id: str,
        body: HomeworkSubmitIn,
    ) -> dict:
        """Submit homework completion."""
        feedback = {
            "notes": body.completion_notes,
            "helpfulness_rating": body.helpfulness_rating,
        }

        updated = await self.repository.submit_homework(
            task_id=task_id,
            patient_id=patient_id,
            org_id=org_id,
            feedback=feedback,
        )

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found.",
            )

        return {"status": "submitted"}
