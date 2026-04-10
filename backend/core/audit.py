from __future__ import annotations

import json
from typing import Any


async def write_audit_event(
    db,
    *,
    org_id: str,
    actor_user_id: str | None,
    event_type: str,
    entity_type: str,
    entity_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    await db.execute(
        """
        INSERT INTO audit_log (
            org_id,
            actor_user_id,
            action,
            event_type,
            entity_type,
            entity_id,
            metadata
        )
        VALUES ($1, $2, 'UPDATE', $3, $4, $5, $6::jsonb)
        """,
        org_id,
        actor_user_id,
        event_type,
        entity_type,
        entity_id,
        json.dumps(metadata or {}),
    )
