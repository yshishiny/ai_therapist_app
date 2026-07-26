from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.access_control.schemas import (
    AuditEventOut,
    ClinicianGroupCreateIn,
    ClinicianGroupMemberIn,
    ClinicianGroupMemberOut,
    ClinicianGroupOut,
    EffectivePermissionsOut,
    PermissionOut,
    UserPermissionOverrideIn,
    UserPermissionOverrideOut,
)
from backend.access_control.service import AccessControlService
from backend.auth import CurrentUser, Role, require_role
from backend.core.audit import write_audit_event
from backend.core.dependencies_access import get_db

router = APIRouter(prefix="/admin", tags=["access-control"])


@router.get(
    "/permissions",
    response_model=list[PermissionOut],
    dependencies=[require_role(Role.ADMIN)],
)
async def list_permissions(db=Depends(get_db)):
    service = AccessControlService(db)
    rows = await service.list_permissions()
    return [PermissionOut(**row) for row in rows]


@router.get(
    "/roles",
    response_model=list[str],
    dependencies=[require_role(Role.ADMIN)],
)
async def list_roles(db=Depends(get_db)):
    service = AccessControlService(db)
    return await service.list_roles()


@router.get(
    "/users/{user_id}/permissions",
    response_model=EffectivePermissionsOut,
    dependencies=[require_role(Role.ADMIN)],
)
async def get_user_permissions(
    user_id: str,
    role: str | None = Query(default=None),
    db=Depends(get_db),
):
    service = AccessControlService(db)
    effective = await service.get_effective_permissions(user_id=user_id, role=role)
    return EffectivePermissionsOut(**effective)


@router.post(
    "/users/{user_id}/permissions",
    response_model=UserPermissionOverrideOut,
    dependencies=[require_role(Role.ADMIN)],
)
async def set_user_permission_override(
    user_id: str,
    body: UserPermissionOverrideIn,
    user: CurrentUser,
    db=Depends(get_db),
):
    service = AccessControlService(db)
    row = await service.upsert_user_override(
        user_id=user_id,
        permission_key=body.permission_key,
        effect=body.effect,
    )
    await write_audit_event(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        event_type="USER_PERMISSION_OVERRIDE_SET",
        entity_type="user_permission",
        metadata={
            "target_user_id": user_id,
            "permission_key": body.permission_key,
            "effect": body.effect,
        },
    )
    return UserPermissionOverrideOut(**row)


@router.post(
    "/clinician-groups",
    response_model=ClinicianGroupOut,
    dependencies=[require_role(Role.ADMIN)],
)
async def create_clinician_group(
    body: ClinicianGroupCreateIn,
    user: CurrentUser,
    db=Depends(get_db),
):
    service = AccessControlService(db)
    row = await service.create_group(org_id=user.org_id, name=body.name)
    await write_audit_event(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        event_type="CLINICIAN_GROUP_CREATED",
        entity_type="clinician_group",
        entity_id=str(row["id"]),
        metadata={"name": body.name},
    )
    return ClinicianGroupOut(**row)


@router.post(
    "/clinician-groups/{group_id}/members",
    response_model=ClinicianGroupMemberOut,
    dependencies=[require_role(Role.ADMIN)],
)
async def add_clinician_group_member(
    group_id: str,
    body: ClinicianGroupMemberIn,
    user: CurrentUser,
    db=Depends(get_db),
):
    service = AccessControlService(db)
    try:
        row = await service.add_group_member(
            org_id=user.org_id,
            group_id=group_id,
            clinician_id=str(body.clinician_id),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    await write_audit_event(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        event_type="CLINICIAN_GROUP_MEMBER_ADDED",
        entity_type="clinician_group_member",
        entity_id=group_id,
        metadata={"clinician_id": str(body.clinician_id)},
    )
    return ClinicianGroupMemberOut(**row)


@router.delete(
    "/clinician-groups/{group_id}/members/{clinician_id}",
    status_code=204,
    dependencies=[require_role(Role.ADMIN)],
)
async def remove_clinician_group_member(
    group_id: str,
    clinician_id: str,
    user: CurrentUser,
    db=Depends(get_db),
):
    service = AccessControlService(db)
    removed = await service.remove_group_member(
        org_id=user.org_id,
        group_id=group_id,
        clinician_id=clinician_id,
    )
    if not removed:
        raise HTTPException(status_code=404, detail="Group member not found")

    await write_audit_event(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        event_type="CLINICIAN_GROUP_MEMBER_REMOVED",
        entity_type="clinician_group_member",
        entity_id=group_id,
        metadata={"clinician_id": clinician_id},
    )


@router.get(
    "/audit",
    response_model=list[AuditEventOut],
    dependencies=[require_role(Role.ADMIN)],
)
async def list_audit_events(
    user: CurrentUser,
    limit: int = 100,
    offset: int = 0,
    db=Depends(get_db),
):
    service = AccessControlService(db)
    rows = await service.list_audit_events(
        org_id=user.org_id,
        limit=limit,
        offset=offset,
    )
    return [AuditEventOut(**row) for row in rows]


@router.get(
    "/audit/{event_id}",
    response_model=AuditEventOut,
    dependencies=[require_role(Role.ADMIN)],
)
async def get_audit_event(
    event_id: str,
    user: CurrentUser,
    db=Depends(get_db),
):
    service = AccessControlService(db)
    row = await service.get_audit_event(org_id=user.org_id, event_id=event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Audit event not found")
    return AuditEventOut(**row)
