from __future__ import annotations

from typing import Any


def _row_to_dict(row) -> dict[str, Any]:
    if row is None:
        return {}
    if isinstance(row, dict):
        return row
    if hasattr(row, "keys"):
        return {key: row[key] for key in row.keys()}
    return dict(row)


class AccessControlService:
    def __init__(self, db):
        self.db = db

    async def list_permissions(self) -> list[dict[str, Any]]:
        rows = await self.db.fetch(
            """
            SELECT key, description
            FROM permissions
            ORDER BY key
            """
        )
        return [_row_to_dict(row) for row in rows]

    async def list_roles(self) -> list[str]:
        return ["admin", "supervisor", "clinician", "patient"]

    async def resolve_user_role(self, user_id: str) -> str:
        row = await self.db.fetchrow(
            "SELECT role FROM clinicians WHERE id = $1",
            user_id,
        )
        if row:
            return str(row["role"])
        return "patient"

    async def get_effective_permissions(
        self,
        *,
        user_id: str,
        role: str | None = None,
    ) -> dict[str, Any]:
        resolved_role = role or await self.resolve_user_role(user_id)
        base_rows = await self.db.fetch(
            """
            SELECT permission_key
            FROM role_permissions
            WHERE role = $1
            ORDER BY permission_key
            """,
            resolved_role,
        )
        override_rows = await self.db.fetch(
            """
            SELECT permission_key, effect, created_at
            FROM user_permissions
            WHERE user_id = $1
            ORDER BY permission_key
            """,
            user_id,
        )

        permissions = {row["permission_key"] for row in base_rows}
        overrides: list[dict[str, Any]] = []

        for row in override_rows:
            data = _row_to_dict(row)
            overrides.append(data)
            if data["effect"] == "ALLOW":
                permissions.add(data["permission_key"])
            elif data["effect"] == "DENY":
                permissions.discard(data["permission_key"])

        return {
            "role": resolved_role,
            "permissions": sorted(permissions),
            "overrides": overrides,
        }

    async def upsert_user_override(
        self,
        *,
        user_id: str,
        permission_key: str,
        effect: str,
    ) -> dict[str, Any]:
        row = await self.db.fetchrow(
            """
            INSERT INTO user_permissions (user_id, permission_key, effect)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, permission_key)
            DO UPDATE SET effect = EXCLUDED.effect
            RETURNING permission_key, effect, created_at
            """,
            user_id,
            permission_key,
            effect,
        )
        return _row_to_dict(row)

    async def user_has_permission(
        self,
        *,
        user_id: str,
        role: str,
        permission_key: str,
    ) -> bool:
        effective = await self.get_effective_permissions(user_id=user_id, role=role)
        return permission_key in effective["permissions"]

    async def create_group(self, *, org_id: str, name: str) -> dict[str, Any]:
        row = await self.db.fetchrow(
            """
            INSERT INTO clinician_groups (org_id, name)
            VALUES ($1, $2)
            RETURNING id, org_id, name, created_at
            """,
            org_id,
            name,
        )
        return _row_to_dict(row)

    async def add_group_member(
        self,
        *,
        org_id: str,
        group_id: str,
        clinician_id: str,
    ) -> dict[str, Any]:
        group = await self.db.fetchrow(
            "SELECT id, org_id FROM clinician_groups WHERE id = $1 AND org_id = $2",
            group_id,
            org_id,
        )
        clinician = await self.db.fetchrow(
            "SELECT id FROM clinicians WHERE id = $1 AND org_id = $2",
            clinician_id,
            org_id,
        )
        if not group or not clinician:
            raise ValueError("Group or clinician not found in organisation")

        await self.db.execute(
            """
            INSERT INTO clinician_group_members (group_id, clinician_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            """,
            group_id,
            clinician_id,
        )
        return {"group_id": group_id, "clinician_id": clinician_id}

    async def remove_group_member(
        self,
        *,
        org_id: str,
        group_id: str,
        clinician_id: str,
    ) -> bool:
        result = await self.db.execute(
            """
            DELETE FROM clinician_group_members gm
            USING clinician_groups g
            WHERE gm.group_id = g.id
              AND gm.group_id = $1
              AND gm.clinician_id = $2
              AND g.org_id = $3
            """,
            group_id,
            clinician_id,
            org_id,
        )
        return result != "DELETE 0"

    async def list_audit_events(
        self,
        *,
        org_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        rows = await self.db.fetch(
            """
            SELECT id, org_id, actor_user_id, action, event_type,
                   entity_type, entity_id, metadata, created_at
            FROM audit_log
            WHERE org_id = $1
            ORDER BY created_at DESC, id DESC
            LIMIT $2 OFFSET $3
            """,
            org_id,
            limit,
            offset,
        )
        return [_row_to_dict(row) for row in rows]

    async def get_audit_event(
        self,
        *,
        org_id: str,
        event_id: str,
    ) -> dict[str, Any] | None:
        row = await self.db.fetchrow(
            """
            SELECT id, org_id, actor_user_id, action, event_type,
                   entity_type, entity_id, metadata, created_at
            FROM audit_log
            WHERE org_id = $1 AND id = $2
            """,
            org_id,
            event_id,
        )
        return _row_to_dict(row) if row else None
