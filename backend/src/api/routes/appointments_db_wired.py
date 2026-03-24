import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from backend.src.core.db import DB
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
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    exists = await db.fetchval(
        'SELECT 1 FROM patients WHERE id=$1 AND org_id=$2',
        uuid.UUID(body.patient_id),
        uuid.UUID(context.org_id),
    )
    if not exists:
        raise HTTPException(status_code=404, detail='Patient not found.')

    row = await db.fetchrow(
        """INSERT INTO appointments
               (id, patient_id, therapist_id, start_time, end_time,
                location, meeting_link, status)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'SCHEDULED')
           RETURNING id, patient_id, start_time, end_time, location, status, meeting_link""",
        uuid.UUID(body.patient_id),
        context.user_id,
        body.start_time,
        body.end_time,
        body.location,
        body.meeting_link,
    )
    return dict(row)


@router.patch('/{appointment_id}', response_model=AppointmentOut)
async def update_appointment_status(
    appointment_id: str,
    new_status: str,
    db: DB,
    context: RequestContext = Depends(get_clinician_context),
):
    row = await db.fetchrow(
        """UPDATE appointments a SET status=$1
           FROM patients p
           WHERE a.id=$2 AND a.patient_id=p.id AND p.org_id=$3
           RETURNING a.id, a.patient_id, a.start_time, a.end_time,
                     a.location, a.status, a.meeting_link""",
        new_status,
        uuid.UUID(appointment_id),
        uuid.UUID(context.org_id),
    )
    if row is None:
        raise HTTPException(status_code=404, detail='Appointment not found.')
    return dict(row)
