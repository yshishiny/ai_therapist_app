from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from auth import CurrentUser, Role, require_role
from core.audit import write_audit_event
from core.dependencies_access import get_db
from patients.assignment_schemas import (
    PatientClinicianAssignmentCreateIn,
    PatientClinicianAssignmentOut,
    PatientClinicianAssignmentPatchIn,
)

router = APIRouter(prefix="/admin", tags=["patient-assignments"])


def _row_to_dict(row):
    if row is None:
        return {}
    if isinstance(row, dict):
        return row
    if hasattr(row, "keys"):
        return {key: row[key] for key in row.keys()}
    return dict(row)


@router.post(
    "/patient-assignments",
    response_model=PatientClinicianAssignmentOut,
    dependencies=[require_role(Role.ADMIN)],
)
async def create_assignment(
    body: PatientClinicianAssignmentCreateIn,
    user: CurrentUser,
    db=Depends(get_db),
):
    patient = await db.fetchrow(
        "SELECT id FROM patients WHERE id = $1 AND org_id = $2",
        body.patient_id,
        user.org_id,
    )
    clinician = await db.fetchrow(
        "SELECT id FROM clinicians WHERE id = $1 AND org_id = $2",
        body.clinician_id,
        user.org_id,
    )
    if not patient or not clinician:
        raise HTTPException(
            status_code=404,
            detail="Patient or clinician not found in organisation",
        )

    if body.is_primary:
        await db.execute(
            """
            UPDATE patient_clinician_assignments
            SET is_primary = FALSE
            WHERE patient_id = $1 AND org_id = $2 AND status = 'ACTIVE'
            """,
            body.patient_id,
            user.org_id,
        )

    row = await db.fetchrow(
        """
        INSERT INTO patient_clinician_assignments (
            org_id,
            patient_id,
            clinician_id,
            is_primary
        )
        VALUES ($1, $2, $3, $4)
        RETURNING id, org_id, patient_id, clinician_id, is_primary, status, assigned_at, ended_at
        """,
        user.org_id,
        body.patient_id,
        body.clinician_id,
        body.is_primary,
    )
    data = _row_to_dict(row)

    await write_audit_event(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        event_type="PATIENT_ASSIGNED_TO_CLINICIAN",
        entity_type="patient_clinician_assignment",
        entity_id=str(data["id"]),
        metadata={
            "patient_id": str(body.patient_id),
            "clinician_id": str(body.clinician_id),
            "is_primary": body.is_primary,
        },
    )
    return PatientClinicianAssignmentOut(**data)


@router.patch(
    "/patient-assignments/{assignment_id}",
    response_model=PatientClinicianAssignmentOut,
    dependencies=[require_role(Role.ADMIN)],
)
async def update_assignment(
    assignment_id: str,
    body: PatientClinicianAssignmentPatchIn,
    user: CurrentUser,
    db=Depends(get_db),
):
    if body.is_primary:
        existing = await db.fetchrow(
            """
            SELECT patient_id
            FROM patient_clinician_assignments
            WHERE id = $1 AND org_id = $2
            """,
            assignment_id,
            user.org_id,
        )
        if existing:
            await db.execute(
                """
                UPDATE patient_clinician_assignments
                SET is_primary = FALSE
                WHERE patient_id = $1 AND org_id = $2 AND status = 'ACTIVE'
                """,
                existing["patient_id"],
                user.org_id,
            )

    row = await db.fetchrow(
        """
        UPDATE patient_clinician_assignments
        SET status = $1,
            is_primary = COALESCE($2, is_primary),
            ended_at = CASE WHEN $1 = 'ENDED' THEN NOW() ELSE NULL END
        WHERE id = $3 AND org_id = $4
        RETURNING id, org_id, patient_id, clinician_id, is_primary, status, assigned_at, ended_at
        """,
        body.status,
        body.is_primary,
        assignment_id,
        user.org_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")

    data = _row_to_dict(row)
    await write_audit_event(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        event_type="PATIENT_ASSIGNMENT_UPDATED",
        entity_type="patient_clinician_assignment",
        entity_id=assignment_id,
        metadata={"status": body.status, "is_primary": body.is_primary},
    )
    return PatientClinicianAssignmentOut(**data)


@router.delete(
    "/patient-assignments/{assignment_id}",
    status_code=204,
    dependencies=[require_role(Role.ADMIN)],
)
async def delete_assignment(
    assignment_id: str,
    user: CurrentUser,
    db=Depends(get_db),
):
    result = await db.execute(
        """
        DELETE FROM patient_clinician_assignments
        WHERE id = $1 AND org_id = $2
        """,
        assignment_id,
        user.org_id,
    )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Assignment not found")

    await write_audit_event(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        event_type="PATIENT_ASSIGNMENT_DELETED",
        entity_type="patient_clinician_assignment",
        entity_id=assignment_id,
    )


@router.get(
    "/clinicians/{clinician_id}/patients",
    dependencies=[require_role(Role.ADMIN)],
)
async def list_clinician_patients(
    clinician_id: str,
    user: CurrentUser,
    db=Depends(get_db),
):
    rows = await db.fetch(
        """
        SELECT p.id, p.full_name, p.status, a.is_primary, a.assigned_at
        FROM patient_clinician_assignments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.clinician_id = $1 AND a.org_id = $2 AND a.status = 'ACTIVE'
        ORDER BY a.is_primary DESC, p.full_name ASC
        """,
        clinician_id,
        user.org_id,
    )
    return [_row_to_dict(row) for row in rows]


@router.get(
    "/patients/{patient_id}/care-team",
    dependencies=[require_role(Role.ADMIN)],
)
async def get_patient_care_team(
    patient_id: str,
    user: CurrentUser,
    db=Depends(get_db),
):
    rows = await db.fetch(
        """
        SELECT a.id, a.patient_id, a.clinician_id, a.is_primary, a.status,
               a.assigned_at, a.ended_at, c.email, c.role
        FROM patient_clinician_assignments a
        JOIN clinicians c ON c.id = a.clinician_id
        WHERE a.patient_id = $1 AND a.org_id = $2
        ORDER BY a.is_primary DESC, a.assigned_at DESC
        """,
        patient_id,
        user.org_id,
    )
    return [_row_to_dict(row) for row in rows]
