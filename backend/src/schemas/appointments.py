from datetime import datetime

from pydantic import BaseModel

# Vocabulary for appointments.appointment_type (migration_appointments_scheduler.sql).
APPOINTMENT_TYPES = (
    'INTAKE',
    'FOLLOW_UP',
    'CBT',
    'GROUP',
    'ASSESSMENT',
    'DOCUMENTATION',
    'ADMIN',
)

# Types that render as a non-patient "block" in the Scheduler grid. A cell is a
# block when its type is one of these OR its patient_id is null. Never classify
# by string-matching the display text.
BLOCK_APPOINTMENT_TYPES = ('DOCUMENTATION', 'ADMIN')


class AppointmentOut(BaseModel):
    id: str
    patient_id: str | None = None      # null for non-patient blocks
    patient_name: str | None = None
    patient_risk: str | None = None
    therapist_id: str | None = None
    appointment_type: str | None = None
    title: str | None = None           # label for non-patient blocks
    start_time: datetime
    end_time: datetime
    location: str
    status: str
    meeting_link: str | None = None


class AppointmentIn(BaseModel):
    patient_id: str
    start_time: datetime
    end_time: datetime
    location: str = 'IN_PERSON'
    meeting_link: str | None = None
    appointment_type: str | None = None
    title: str | None = None
