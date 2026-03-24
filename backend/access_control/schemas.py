from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class PermissionOut(BaseModel):
    key: str
    description: str


class UserPermissionOverrideIn(BaseModel):
    permission_key: str
    effect: Literal["ALLOW", "DENY"]


class UserPermissionOverrideOut(BaseModel):
    permission_key: str
    effect: Literal["ALLOW", "DENY"]
    created_at: datetime


class EffectivePermissionsOut(BaseModel):
    role: str
    permissions: list[str]
    overrides: list[UserPermissionOverrideOut]


class ClinicianGroupCreateIn(BaseModel):
    name: str


class ClinicianGroupOut(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    created_at: datetime


class ClinicianGroupMemberIn(BaseModel):
    clinician_id: UUID


class ClinicianGroupMemberOut(BaseModel):
    group_id: UUID
    clinician_id: UUID


class AuditEventOut(BaseModel):
    id: UUID
    org_id: UUID | None = None
    actor_user_id: str | None = None
    action: str | None = None
    event_type: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    metadata: dict | None = None
    created_at: datetime
