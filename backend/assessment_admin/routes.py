from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.access_control.service import write_audit_log
from backend.assessment_admin.schemas import (
    AssessmentCatalogCreateIn,
    AssessmentCatalogOut,
    AssessmentCatalogUpdateIn,
    AssessmentVersionCreateIn,
    AssessmentVersionOut,
)
from backend.assessment_admin.service import catalog_row_to_dict, version_row_to_dict
from backend.auth import Role, TokenPayload, require_role
from backend.core.dependencies_access import DB


CatalogViewer = Annotated[
    TokenPayload,
    require_role(Role.ADMIN, Role.SUPERVISOR),
]
CatalogManager = Annotated[TokenPayload, require_role(Role.ADMIN)]

router = APIRouter(tags=["assessment-admin"])


async def _get_catalog_or_404(db: DB, *, org_id: str, catalog_id: str):
    row = await db.fetchrow(
        """
        SELECT
            ac.id,
            ac.template_key,
            ac.legacy_template_id,
            ac.name,
            ac.name_ar,
            ac.template_type,
            ac.category,
            ac.category_ar,
            ac.license_status,
            ac.description,
            ac.is_active,
            ac.current_published_version_id,
            ac.owner_user_id,
            ac.created_at,
            ac.updated_at,
            av.version_number AS current_published_version_number
        FROM assessment_catalog ac
        LEFT JOIN assessment_versions av ON av.id = ac.current_published_version_id
        WHERE ac.id = $1 AND ac.org_id = $2
        """,
        uuid.UUID(catalog_id),
        uuid.UUID(org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Assessment catalog item not found.")
    return row


async def _get_version_or_404(db: DB, *, catalog_id: str, version_id: str):
    row = await db.fetchrow(
        """
        SELECT
            id,
            catalog_id,
            version_number,
            status,
            name,
            template_type,
            license_status,
            definition_json,
            scoring_rules,
            interpretation_rules,
            risk_rules,
            delivery,
            google_form_url,
            notes,
            created_at,
            published_at
        FROM assessment_versions
        WHERE catalog_id = $1 AND id = $2
        """,
        uuid.UUID(catalog_id),
        uuid.UUID(version_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Assessment version not found.")
    return row


@router.get("/admin/assessment-catalog", response_model=list[AssessmentCatalogOut])
async def list_assessment_catalog(user: CatalogViewer, db: DB):
    # Admins see everything in the org; non-admins see org-wide entries
    # (owner_user_id IS NULL) plus anything they personally own.
    rows = await db.fetch(
        """
        SELECT
            ac.id,
            ac.template_key,
            ac.legacy_template_id,
            ac.name,
            ac.name_ar,
            ac.template_type,
            ac.category,
            ac.category_ar,
            ac.license_status,
            ac.description,
            ac.is_active,
            ac.current_published_version_id,
            ac.owner_user_id,
            ac.created_at,
            ac.updated_at,
            av.version_number AS current_published_version_number
        FROM assessment_catalog ac
        LEFT JOIN assessment_versions av ON av.id = ac.current_published_version_id
        WHERE ac.org_id = $1
          AND ($2 = 'admin' OR ac.owner_user_id IS NULL OR ac.owner_user_id = $3)
        ORDER BY ac.name ASC, ac.template_key ASC
        """,
        uuid.UUID(user.org_id),
        user.role.value,
        uuid.UUID(user.sub),
    )
    return [catalog_row_to_dict(row) for row in rows]


@router.post(
    "/admin/assessment-catalog/upload-json",
    response_model=AssessmentCatalogOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_assessment_json(
    user: CatalogManager,
    db: DB,
    file: UploadFile = File(...),
):
    """A clinician-authored assessment as a ready-made JSON file, uploaded
    directly (no OCR/AI step -- the uploader is asserting the content is
    correct). Lands as a draft, owner-scoped to the uploader, same as
    AI-structured uploads -- still needs a publish step before it's
    assignable to patients."""
    if file.content_type not in ("application/json", "text/json", "text/plain"):
        raise HTTPException(status_code=400, detail="Upload a .json file.")

    raw = await file.read()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Not valid JSON: {exc}") from exc

    name = payload.get("name")
    definition_json = payload.get("definition_json")
    if not name or not isinstance(name, str):
        raise HTTPException(status_code=400, detail="JSON must include a string 'name' field.")
    if not isinstance(definition_json, dict) or not definition_json.get("questions"):
        raise HTTPException(status_code=400, detail="JSON must include a 'definition_json' object with a non-empty 'questions' list.")

    name_ar = payload.get("name_ar")
    if name_ar is not None and not isinstance(name_ar, str):
        raise HTTPException(status_code=400, detail="'name_ar' must be a string when provided.")
    category_ar = payload.get("category_ar")
    if category_ar is not None and not isinstance(category_ar, str):
        raise HTTPException(status_code=400, detail="'category_ar' must be a string when provided.")

    template_key = f"custom_{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)
    catalog_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO assessment_catalog (
            id, org_id, template_key, name, name_ar, template_type, category, category_ar,
            license_status, description, owner_user_id, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'SCREENING', $6, $7, 'VERIFY', $8, $9, $9, $10, $10)
        """,
        catalog_id,
        uuid.UUID(user.org_id),
        template_key,
        name,
        name_ar,
        payload.get("category"),
        category_ar,
        payload.get("description") or "Uploaded directly by the clinician as a ready-made JSON file.",
        uuid.UUID(user.sub),
        now,
    )
    version_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO assessment_versions (
            id, catalog_id, version_number, status, name, template_type,
            license_status, definition_json, scoring_rules, interpretation_rules,
            risk_rules, created_by, created_at
        )
        VALUES ($1, $2, 1, 'draft', $3, 'SCREENING', 'VERIFY', $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)
        """,
        version_id,
        catalog_id,
        name,
        json.dumps(definition_json),
        json.dumps(payload["scoring_rules"]) if payload.get("scoring_rules") else None,
        json.dumps(payload["interpretation_rules"]) if payload.get("interpretation_rules") else None,
        json.dumps(payload["risk_rules"]) if payload.get("risk_rules") else None,
        uuid.UUID(user.sub),
        now,
    )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="CREATE",
        entity_type="assessment_catalog",
        entity_id=str(catalog_id),
        metadata={"source": "json_upload", "filename": file.filename},
    )

    created = await _get_catalog_or_404(db, org_id=user.org_id, catalog_id=str(catalog_id))
    return catalog_row_to_dict(created)


@router.post(
    "/admin/assessment-catalog",
    response_model=AssessmentCatalogOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_assessment_catalog_item(
    body: AssessmentCatalogCreateIn,
    user: CatalogManager,
    db: DB,
):
    existing = await db.fetchval(
        """
        SELECT 1
        FROM assessment_catalog
        WHERE org_id = $1 AND template_key = $2
        """,
        uuid.UUID(user.org_id),
        body.template_key,
    )
    if existing:
        raise HTTPException(status_code=409, detail="This template key already exists.")

    legacy_template_id = body.legacy_template_id or body.template_key
    legacy_template = await db.fetchrow(
        """
        SELECT id, name, template_type, license_status
        FROM assessment_templates
        WHERE id = $1
        """,
        legacy_template_id,
    )

    name = body.name or (legacy_template["name"] if legacy_template else None)
    if not name:
        raise HTTPException(status_code=400, detail="A name is required.")

    now = datetime.now(timezone.utc)
    catalog_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO assessment_catalog (
            id,
            org_id,
            template_key,
            legacy_template_id,
            name,
            name_ar,
            template_type,
            category,
            category_ar,
            license_status,
            description,
            created_by,
            created_at,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
        """,
        catalog_id,
        uuid.UUID(user.org_id),
        body.template_key,
        legacy_template_id if legacy_template else None,
        name,
        body.name_ar,
        body.template_type or (legacy_template["template_type"] if legacy_template else None),
        body.category,
        body.category_ar,
        body.license_status or (legacy_template["license_status"] if legacy_template else "VERIFY"),
        body.description,
        uuid.UUID(user.sub),
        now,
    )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="CREATE",
        entity_type="assessment_catalog",
        entity_id=str(catalog_id),
        metadata=body.model_dump(),
    )

    created = await _get_catalog_or_404(
        db,
        org_id=user.org_id,
        catalog_id=str(catalog_id),
    )
    return catalog_row_to_dict(created)


@router.patch(
    "/admin/assessment-catalog/{catalog_id}",
    response_model=AssessmentCatalogOut,
)
async def update_assessment_catalog_item(
    catalog_id: str,
    body: AssessmentCatalogUpdateIn,
    user: CatalogManager,
    db: DB,
):
    existing = await _get_catalog_or_404(
        db,
        org_id=user.org_id,
        catalog_id=catalog_id,
    )
    updated = await db.fetchrow(
        """
        UPDATE assessment_catalog
        SET name = COALESCE($3, name),
            template_type = COALESCE($4, template_type),
            license_status = COALESCE($5, license_status),
            description = COALESCE($6, description),
            is_active = COALESCE($7, is_active),
            updated_at = NOW()
        WHERE id = $1 AND org_id = $2
        RETURNING
            id,
            template_key,
            legacy_template_id,
            name,
            name_ar,
            template_type,
            category,
            category_ar,
            license_status,
            description,
            is_active,
            current_published_version_id,
            created_at,
            updated_at
        """,
        uuid.UUID(catalog_id),
        uuid.UUID(user.org_id),
        body.name,
        body.template_type,
        body.license_status,
        body.description,
        body.is_active,
    )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="UPDATE",
        entity_type="assessment_catalog",
        entity_id=catalog_id,
        metadata=body.model_dump(exclude_none=True),
    )

    response = catalog_row_to_dict(updated)
    response["current_published_version_number"] = existing["current_published_version_number"]
    return response


@router.get(
    "/admin/assessment-catalog/{catalog_id}/versions",
    response_model=list[AssessmentVersionOut],
)
async def list_assessment_versions(
    catalog_id: str,
    user: CatalogViewer,
    db: DB,
):
    await _get_catalog_or_404(db, org_id=user.org_id, catalog_id=catalog_id)
    rows = await db.fetch(
        """
        SELECT
            id,
            catalog_id,
            version_number,
            status,
            name,
            template_type,
            license_status,
            definition_json,
            scoring_rules,
            interpretation_rules,
            risk_rules,
            delivery,
            google_form_url,
            notes,
            created_at,
            published_at
        FROM assessment_versions
        WHERE catalog_id = $1
        ORDER BY version_number DESC
        """,
        uuid.UUID(catalog_id),
    )
    return [version_row_to_dict(row) for row in rows]


@router.post(
    "/admin/assessment-catalog/{catalog_id}/versions",
    response_model=AssessmentVersionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_assessment_version(
    catalog_id: str,
    body: AssessmentVersionCreateIn,
    user: CatalogManager,
    db: DB,
):
    catalog = await _get_catalog_or_404(
        db,
        org_id=user.org_id,
        catalog_id=catalog_id,
    )
    next_version = (await db.fetchval(
        """
        SELECT COALESCE(MAX(version_number), 0) + 1
        FROM assessment_versions
        WHERE catalog_id = $1
        """,
        uuid.UUID(catalog_id),
    )) or 1

    now = datetime.now(timezone.utc)
    version_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO assessment_versions (
            id,
            catalog_id,
            version_number,
            status,
            name,
            template_type,
            license_status,
            definition_json,
            scoring_rules,
            interpretation_rules,
            risk_rules,
            delivery,
            google_form_url,
            notes,
            created_by,
            created_at
        )
        VALUES (
            $1, $2, $3, 'draft', $4, $5, $6, $7::jsonb, $8::jsonb,
            $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15
        )
        """,
        version_id,
        uuid.UUID(catalog_id),
        int(next_version),
        body.name or catalog["name"],
        body.template_type or catalog["template_type"],
        body.license_status or catalog["license_status"],
        json.dumps(body.definition_json) if body.definition_json is not None else None,
        json.dumps(body.scoring_rules) if body.scoring_rules is not None else None,
        json.dumps(body.interpretation_rules) if body.interpretation_rules is not None else None,
        json.dumps(body.risk_rules) if body.risk_rules is not None else None,
        body.delivery,
        body.google_form_url,
        body.notes,
        uuid.UUID(user.sub),
        now,
    )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="CREATE",
        entity_type="assessment_version",
        entity_id=str(version_id),
        metadata={"catalog_id": catalog_id, "version_number": int(next_version)},
    )

    created = await _get_version_or_404(
        db,
        catalog_id=catalog_id,
        version_id=str(version_id),
    )
    return version_row_to_dict(created)


@router.patch(
    "/admin/assessment-versions/{version_id}",
    response_model=AssessmentVersionOut,
)
async def update_assessment_version(
    version_id: str,
    body: AssessmentVersionCreateIn,
    user: CatalogManager,
    db: DB,
):
    """Edit a draft version's content before publishing. Only 'draft'
    versions can be edited -- published versions are immutable history."""
    version = await db.fetchrow(
        """
        SELECT av.id, av.status, ac.org_id
        FROM assessment_versions av
        JOIN assessment_catalog ac ON ac.id = av.catalog_id
        WHERE av.id = $1 AND ac.org_id = $2
        """,
        uuid.UUID(version_id),
        uuid.UUID(user.org_id),
    )
    if not version:
        raise HTTPException(status_code=404, detail="Assessment version not found.")
    if version["status"] != "draft":
        raise HTTPException(status_code=409, detail="Only draft versions can be edited.")

    await db.execute(
        """
        UPDATE assessment_versions
        SET name = COALESCE($2, name),
            definition_json = COALESCE($3::jsonb, definition_json),
            scoring_rules = COALESCE($4::jsonb, scoring_rules),
            interpretation_rules = COALESCE($5::jsonb, interpretation_rules),
            risk_rules = COALESCE($6::jsonb, risk_rules),
            notes = COALESCE($7, notes)
        WHERE id = $1
        """,
        uuid.UUID(version_id),
        body.name,
        json.dumps(body.definition_json) if body.definition_json is not None else None,
        json.dumps(body.scoring_rules) if body.scoring_rules is not None else None,
        json.dumps(body.interpretation_rules) if body.interpretation_rules is not None else None,
        json.dumps(body.risk_rules) if body.risk_rules is not None else None,
        body.notes,
    )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="UPDATE",
        entity_type="assessment_version",
        entity_id=version_id,
        metadata={"edited_draft": True},
    )

    catalog_id = await db.fetchval("SELECT catalog_id FROM assessment_versions WHERE id = $1", uuid.UUID(version_id))
    updated = await _get_version_or_404(db, catalog_id=str(catalog_id), version_id=version_id)
    return version_row_to_dict(updated)


@router.post(
    "/admin/assessment-versions/{version_id}/publish",
    response_model=AssessmentVersionOut,
)
async def publish_assessment_version(
    version_id: str,
    user: CatalogManager,
    db: DB,
):
    version = await db.fetchrow(
        """
        SELECT
            av.id,
            av.catalog_id,
            av.version_number,
            av.status,
            av.name,
            av.template_type,
            av.license_status,
            av.definition_json,
            av.scoring_rules,
            av.interpretation_rules,
            av.risk_rules,
            av.delivery,
            av.google_form_url,
            av.notes,
            av.created_at,
            av.published_at,
            ac.org_id
        FROM assessment_versions av
        JOIN assessment_catalog ac ON ac.id = av.catalog_id
        WHERE av.id = $1 AND ac.org_id = $2
        """,
        uuid.UUID(version_id),
        uuid.UUID(user.org_id),
    )
    if not version:
        raise HTTPException(status_code=404, detail="Assessment version not found.")

    now = datetime.now(timezone.utc)
    await db.execute(
        """
        UPDATE assessment_versions
        SET status = 'archived'
        WHERE catalog_id = $1
          AND status = 'published'
          AND id <> $2
        """,
        version["catalog_id"],
        uuid.UUID(version_id),
    )
    await db.execute(
        """
        UPDATE assessment_versions
        SET status = 'published',
            published_at = $2,
            published_by = $3
        WHERE id = $1
        """,
        uuid.UUID(version_id),
        now,
        uuid.UUID(user.sub),
    )
    await db.execute(
        """
        UPDATE assessment_catalog
        SET current_published_version_id = $1,
            updated_at = $3
        WHERE id = $2
        """,
        uuid.UUID(version_id),
        version["catalog_id"],
        now,
    )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="UPDATE",
        entity_type="assessment_version",
        entity_id=version_id,
        metadata={"published": True, "catalog_id": str(version["catalog_id"])},
    )

    published = await _get_version_or_404(
        db,
        catalog_id=str(version["catalog_id"]),
        version_id=version_id,
    )
    return version_row_to_dict(published)
