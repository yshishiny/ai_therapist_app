from __future__ import annotations

import json
import uuid
from typing import Any

import asyncpg


def _decode_json(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def catalog_row_to_dict(row: asyncpg.Record | dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    return {
        "id": str(data["id"]),
        "template_key": data["template_key"],
        "legacy_template_id": data.get("legacy_template_id"),
        "name": data["name"],
        "template_type": data.get("template_type"),
        "license_status": data.get("license_status"),
        "description": data.get("description"),
        "is_active": bool(data.get("is_active", True)),
        "current_published_version_id": str(data["current_published_version_id"])
        if data.get("current_published_version_id")
        else None,
        "current_published_version_number": data.get("current_published_version_number"),
        "created_at": data["created_at"],
        "updated_at": data["updated_at"],
    }


def version_row_to_dict(row: asyncpg.Record | dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    return {
        "id": str(data["id"]),
        "catalog_id": str(data["catalog_id"]),
        "version_number": data["version_number"],
        "status": data["status"],
        "name": data["name"],
        "template_type": data.get("template_type"),
        "license_status": data.get("license_status"),
        "definition_json": _decode_json(data.get("definition_json")),
        "scoring_rules": _decode_json(data.get("scoring_rules")),
        "interpretation_rules": _decode_json(data.get("interpretation_rules")),
        "risk_rules": _decode_json(data.get("risk_rules")),
        "delivery": data.get("delivery"),
        "google_form_url": data.get("google_form_url"),
        "notes": data.get("notes"),
        "created_at": data["created_at"],
        "published_at": data.get("published_at"),
    }


async def list_available_templates(
    db: asyncpg.Pool,
    *,
    org_id: str,
) -> list[dict[str, Any]]:
    managed_rows = await db.fetch(
        """
        SELECT
            ac.template_key AS id,
            COALESCE(av.name, ac.name, at.name) AS name,
            COALESCE(av.template_type, ac.template_type, at.template_type) AS template_type,
            COALESCE(av.license_status, ac.license_status, at.license_status) AS license_status,
            COALESCE(av.definition_json, '{}'::jsonb) AS definition_json,
            COALESCE(av.scoring_rules, at.scoring_rules) AS scoring_rules,
            COALESCE(av.interpretation_rules, at.interpretation_rules) AS interpretation_rules,
            COALESCE(av.delivery, at.delivery, 'IN_APP') AS delivery,
            COALESCE(av.google_form_url, at.google_form_url) AS google_form_url
        FROM assessment_catalog ac
        LEFT JOIN assessment_versions av ON av.id = ac.current_published_version_id
        LEFT JOIN assessment_templates at ON at.id = ac.legacy_template_id
        WHERE ac.org_id = $1
          AND ac.is_active = TRUE
          AND ac.current_published_version_id IS NOT NULL
        ORDER BY ac.name ASC, ac.template_key ASC
        """,
        uuid.UUID(org_id),
    )

    unmanaged_rows = await db.fetch(
        """
        SELECT
            at.id,
            at.name,
            at.template_type,
            at.license_status,
            '{}'::jsonb AS definition_json,
            at.scoring_rules,
            at.interpretation_rules,
            at.delivery,
            at.google_form_url
        FROM assessment_templates at
        WHERE NOT EXISTS (
            SELECT 1
            FROM assessment_catalog ac
            WHERE ac.org_id = $1
              AND ac.is_active = TRUE
              AND ac.current_published_version_id IS NOT NULL
              AND ac.template_key = at.id
        )
        ORDER BY at.id ASC
        """,
        uuid.UUID(org_id),
    )

    rows = [*managed_rows, *unmanaged_rows]
    results: list[dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        results.append(
            {
                "id": item["id"],
                "name": item["name"],
                "template_type": item.get("template_type"),
                "license_status": item.get("license_status"),
                "definition_json": _decode_json(item.get("definition_json")),
                "scoring_rules": _decode_json(item.get("scoring_rules")),
                "interpretation_rules": _decode_json(item.get("interpretation_rules")),
                "delivery": item.get("delivery"),
                "google_form_url": item.get("google_form_url"),
            }
        )
    return results
