from fastapi import HTTPException, status

from backend.src.repositories.appointment_repository_db_real import AppointmentRepositoryDbReal
from backend.src.schemas.appointments import AppointmentIn


class AppointmentServiceDb:
    def __init__(self, repository: AppointmentRepositoryDbReal):
        self.repository = repository

    async def list_appointments(self, org_id: str) -> list[dict]:
        return await self.repository.list_appointments(org_id=org_id)

    async def get_current_appointment(self, org_id: str, therapist_id: str) -> dict | None:
        return await self.repository.get_current_appointment(org_id=org_id, therapist_id=therapist_id)

    async def create_appointment(
        self,
        body: AppointmentIn,
        org_id: str,
        therapist_id: str,
    ) -> dict:
        """Create a new appointment."""
        # Verify patient exists
        if not await self.repository.patient_exists(body.patient_id, org_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found.",
            )

        return await self.repository.create_appointment(
            patient_id=body.patient_id,
            therapist_id=therapist_id,
            start_time=body.start_time,
            end_time=body.end_time,
            location=body.location,
            meeting_link=body.meeting_link,
        )

    async def update_appointment_status(
        self,
        appointment_id: str,
        org_id: str,
        new_status: str,
    ) -> dict:
        """Update appointment status."""
        result = await self.repository.update_appointment_status(
            appointment_id=appointment_id,
            org_id=org_id,
            new_status=new_status,
        )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found.",
            )
        return result
