from fastapi import APIRouter, Depends, status

from backend.src.core.dependencies import (
    RequestContext,
    get_appointment_service,
    get_clinician_context,
)
from backend.src.schemas.appointments import AppointmentIn, AppointmentOut
from backend.src.services.appointment_service_db import AppointmentServiceDb

router = APIRouter(prefix='/appointments', tags=['calendar'])


@router.get('', response_model=list[AppointmentOut])
async def list_appointments(
    context: RequestContext = Depends(get_clinician_context),
    service: AppointmentServiceDb = Depends(get_appointment_service),
):
    return await service.list_appointments(org_id=context.org_id)


@router.post('', response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    body: AppointmentIn,
    context: RequestContext = Depends(get_clinician_context),
    service: AppointmentServiceDb = Depends(get_appointment_service),
):
    return await service.create_appointment(
        body=body,
        org_id=context.org_id,
        therapist_id=context.user_id,
    )


@router.patch('/{appointment_id}', response_model=AppointmentOut)
async def update_appointment_status(
    appointment_id: str,
    new_status: str,
    context: RequestContext = Depends(get_clinician_context),
    service: AppointmentServiceDb = Depends(get_appointment_service),
):
    return await service.update_appointment_status(
        appointment_id=appointment_id,
        org_id=context.org_id,
        new_status=new_status,
    )
