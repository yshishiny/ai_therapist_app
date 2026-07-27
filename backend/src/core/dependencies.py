from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, Request, status

from backend.auth import CurrentUser, Role
from backend.src.core.db import DB
from backend.src.repositories.admin_repository_db_real import AdminRepositoryDbReal
from backend.src.repositories.ai_reporting_repository_db_real import AiReportingRepositoryDbReal
from backend.src.repositories.appointment_repository_db_real import AppointmentRepositoryDbReal
from backend.src.repositories.assessment_repository_db_real import AssessmentRepositoryDbReal
from backend.src.repositories.auth_repository_db_real import AuthRepositoryDbReal
from backend.src.repositories.careplan_repository_db_real import CarePlanRepositoryDbReal
from backend.src.repositories.clinician_repository_db_real import ClinicianRepositoryDbReal
from backend.src.repositories.dashboard_repository_db_real import DashboardRepositoryDbReal
from backend.src.repositories.homework_repository_db_real import HomeworkRepositoryDbReal
from backend.src.repositories.patient_portal_repository_db_real import PatientPortalRepositoryDbReal
from backend.src.repositories.patient_repository_db_real import PatientRepositoryDbReal
from backend.src.repositories.session_repository_db_real import SessionRepositoryDbReal
from backend.src.services.admin_service_db import AdminServiceDb
from backend.src.services.ai_reporting_service_db import AiReportingServiceDb
from backend.src.services.appointment_service_db import AppointmentServiceDb
from backend.src.services.assessment_service_db import AssessmentServiceDb
from backend.src.services.auth_service_db import AuthServiceDb
from backend.src.services.careplan_service_db import CarePlanServiceDb
from backend.src.services.clinician_service_db import ClinicianServiceDb
from backend.src.services.dashboard_service_db import DashboardServiceDb
from backend.src.services.homework_service_db import HomeworkServiceDb
from backend.src.services.patient_portal_service_db import PatientPortalServiceDb
from backend.src.services.patient_service_db import PatientServiceDb
from backend.src.services.session_service_db import SessionServiceDb


@dataclass(frozen=True)
class RequestContext:
    org_id: str
    user_id: str
    role: str
    correlation_id: str
    patient_id: str | None = None


def get_request_context(request: Request, user: CurrentUser) -> RequestContext:
    patient_id = user.sub if user.role == Role.PATIENT else None
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    return RequestContext(
        org_id=user.org_id,
        user_id=user.sub,
        role=user.role.value,
        correlation_id=correlation_id,
        patient_id=patient_id,
    )


def get_clinician_context(
    context: RequestContext = Depends(get_request_context),
) -> RequestContext:
    if context.role == Role.PATIENT.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clinician access only.",
        )
    return context


def get_patient_context(
    context: RequestContext = Depends(get_request_context),
) -> RequestContext:
    if context.patient_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access only.",
        )
    return context


def get_db_and_context(
    db: DB,
    context: RequestContext = Depends(get_request_context),
) -> tuple[Any, RequestContext]:
    return db, context


def get_auth_service(db: DB) -> AuthServiceDb:
    return AuthServiceDb(repository=AuthRepositoryDbReal(db=db))


def get_patient_service(db: DB) -> PatientServiceDb:
    return PatientServiceDb(repository=PatientRepositoryDbReal(db=db))


def get_clinician_service(db: DB) -> ClinicianServiceDb:
    return ClinicianServiceDb(repository=ClinicianRepositoryDbReal(db=db))


def get_assessment_service(db: DB) -> AssessmentServiceDb:
    return AssessmentServiceDb(repository=AssessmentRepositoryDbReal(db=db))


def get_session_service(db: DB) -> SessionServiceDb:
    return SessionServiceDb(repository=SessionRepositoryDbReal(db=db))


def get_appointment_service(db: DB) -> AppointmentServiceDb:
    return AppointmentServiceDb(repository=AppointmentRepositoryDbReal(db=db))


def get_homework_service(db: DB) -> HomeworkServiceDb:
    return HomeworkServiceDb(repository=HomeworkRepositoryDbReal(db=db))


def get_careplan_service(db: DB) -> CarePlanServiceDb:
    return CarePlanServiceDb(repository=CarePlanRepositoryDbReal(db=db))


def get_dashboard_service(db: DB) -> DashboardServiceDb:
    return DashboardServiceDb(repository=DashboardRepositoryDbReal(db=db))


def get_admin_service(db: DB) -> AdminServiceDb:
    return AdminServiceDb(repository=AdminRepositoryDbReal(db=db))


def get_patient_portal_service(db: DB) -> PatientPortalServiceDb:
    return PatientPortalServiceDb(repository=PatientPortalRepositoryDbReal(db=db))


def get_ai_reporting_service(db: DB) -> AiReportingServiceDb:
    return AiReportingServiceDb(repository=AiReportingRepositoryDbReal(db=db))
