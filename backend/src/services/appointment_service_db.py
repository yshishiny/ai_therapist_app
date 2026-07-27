from datetime import date

from fastapi import HTTPException, status

from backend.src.repositories.appointment_repository_db_real import AppointmentRepositoryDbReal
from backend.src.schemas.appointments import APPOINTMENT_TYPES, AppointmentIn


class AppointmentServiceDb:
    def __init__(self, repository: AppointmentRepositoryDbReal):
        self.repository = repository

    async def list_appointments(
        self,
        org_id: str,
        date_from: date | None = None,
        date_to: date | None = None,
        therapist_id: str | None = None,
    ) -> list[dict]:
        """List appointments, optionally narrowed to a date range and/or clinician.

        With no filters this delegates to the original unfiltered query, so the
        existing no-parameter callers (mobile calendar, scheduler screen) keep
        exactly the behaviour they have today.
        """
        if date_from is None and date_to is None and therapist_id is None:
            return await self.repository.list_appointments(org_id=org_id)

        if date_from is not None and date_to is not None and date_from > date_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="'from' must not be later than 'to'.",
            )

        return await self.repository.list_appointments_range(
            org_id=org_id,
            date_from=date_from,
            date_to=date_to,
            therapist_id=therapist_id,
        )

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

        appointment_type = body.appointment_type
        if appointment_type is not None:
            appointment_type = appointment_type.upper()
            if appointment_type not in APPOINTMENT_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown appointment_type. Expected one of: {', '.join(APPOINTMENT_TYPES)}.",
                )

        return await self.repository.create_appointment(
            patient_id=body.patient_id,
            therapist_id=therapist_id,
            org_id=org_id,
            start_time=body.start_time,
            end_time=body.end_time,
            location=body.location,
            meeting_link=body.meeting_link,
            appointment_type=appointment_type,
            title=body.title,
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
