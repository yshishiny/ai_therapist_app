from datetime import date

from fastapi import APIRouter, Depends, Query, status

from backend.core.dependencies_access import require_permission
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
    date_from: date | None = Query(
        None,
        alias='from',
        description='Inclusive start of the calendar-date range (YYYY-MM-DD).',
    ),
    date_to: date | None = Query(
        None,
        alias='to',
        description='Inclusive end of the calendar-date range (YYYY-MM-DD).',
    ),
    mine: bool = Query(
        False,
        description="Scope to the calling clinician's own calendar.",
    ),
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('appointments.view'),
    service: AppointmentServiceDb = Depends(get_appointment_service),
):
    """List appointments for the organisation.

    With no query parameters this returns every appointment in the org across
    all time, ordered by start_time — unchanged from before, because existing
    clients call it that way.

    `from`/`to` narrow it to an inclusive calendar-date window and `mine=true`
    narrows it to the caller: together, the Scheduler's week view.
    """
    return await service.list_appointments(
        org_id=context.org_id,
        date_from=date_from,
        date_to=date_to,
        therapist_id=context.user_id if mine else None,
    )


@router.get('/current', response_model=AppointmentOut | None)
async def get_current_appointment(
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('appointments.view'),
    service: AppointmentServiceDb = Depends(get_appointment_service),
):
    """The logged-in clinician's ongoing (or about-to-start) appointment, if any."""
    return await service.get_current_appointment(org_id=context.org_id, therapist_id=context.user_id)


@router.post('', response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    body: AppointmentIn,
    context: RequestContext = Depends(get_clinician_context),
    _perm=require_permission('appointments.manage'),
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
    _perm=require_permission('appointments.manage'),
    service: AppointmentServiceDb = Depends(get_appointment_service),
):
    return await service.update_appointment_status(
        appointment_id=appointment_id,
        org_id=context.org_id,
        new_status=new_status,
    )
