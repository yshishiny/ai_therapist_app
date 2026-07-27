"""Controlled Trial Mode endpoints.

Enforcement lives in service.py; these routes just wire it to HTTP and
keep an audit trail. Nothing here can be bypassed by a client that
ignores the UI banners.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, HTTPException, status

from backend.access_control.service import write_audit_log
from backend.assessment_trials import service as trial_service
from backend.assessment_trials.schemas import (
    ComplianceReviewIn,
    LicenseConversionIn,
    LicenseOut,
    NormalizedResultIn,
    TrialActivationIn,
    TrialAdministrationIn,
    TrialOut,
)
from backend.auth import Role, TokenPayload, require_role
from backend.core.dependencies_access import DB

TrialViewer = Annotated[TokenPayload, require_role(Role.ADMIN, Role.SUPERVISOR, Role.CLINICIAN)]
TrialManager = Annotated[TokenPayload, require_role(Role.ADMIN)]

router = APIRouter(tags=["assessment-trials"])


async def _catalog_or_404(db: DB, *, org_id: str, catalog_id: str) -> dict:
    row = await db.fetchrow(
        """
        SELECT id, template_key, name, availability_state, license_status,
               requires_governance_approval
        FROM assessment_catalog
        WHERE id = $1 AND org_id = $2
        """,
        uuid.UUID(catalog_id),
        uuid.UUID(org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    return dict(row)


async def _trial_or_404(db: DB, *, org_id: str, trial_id: str) -> dict:
    row = await db.fetchrow(
        """
        SELECT t.*, ac.name AS instrument_name, ac.requires_governance_approval
        FROM assessment_trials t
        JOIN assessment_catalog ac ON ac.id = t.catalog_id
        WHERE t.id = $1 AND t.org_id = $2
        """,
        uuid.UUID(trial_id),
        uuid.UUID(org_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Trial not found.")
    return dict(row)


@router.post(
    "/admin/assessment-catalog/{catalog_id}/trial",
    response_model=TrialOut,
    status_code=status.HTTP_201_CREATED,
)
async def activate_trial(
    catalog_id: str,
    body: TrialActivationIn,
    user: TrialManager,
    db: DB,
    governance_approved: bool = False,
):
    """The activation gate. Rejects anything that would amount to using a
    publisher's instrument without authorization."""
    catalog = await _catalog_or_404(db, org_id=user.org_id, catalog_id=catalog_id)

    try:
        trial_service.assert_can_activate(catalog, body, governance_approved)
    except trial_service.TrialError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    existing = await db.fetchval(
        """
        SELECT 1 FROM assessment_trials
        WHERE catalog_id = $1 AND org_id = $2 AND status IN ('pending', 'active')
        """,
        uuid.UUID(catalog_id),
        uuid.UUID(user.org_id),
    )
    if existing:
        raise HTTPException(
            status_code=409, detail="A trial for this instrument is already open."
        )

    now = datetime.now(timezone.utc)
    row = await db.fetchrow(
        """
        INSERT INTO assessment_trials (
            id, catalog_id, org_id, trial_source, publisher, authorization_reference,
            organization, approved_users, start_date, expiry_date,
            maximum_administrations, allowed_country, allowed_language,
            real_patient_use_allowed, report_export_allowed,
            content_storage_allowed, result_storage_allowed,
            terms_accepted_at, terms_accepted_by, status, created_by, created_at, updated_at
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'active',$20,$21,$21
        )
        RETURNING *
        """,
        uuid.uuid4(),
        uuid.UUID(catalog_id),
        uuid.UUID(user.org_id),
        body.trial_source,
        body.publisher,
        body.authorization_reference,
        body.organization,
        json.dumps(body.approved_users),
        body.start_date,
        body.expiry_date,
        body.maximum_administrations,
        body.allowed_country,
        body.allowed_language,
        body.real_patient_use_allowed,
        body.report_export_allowed,
        body.content_storage_allowed,
        body.result_storage_allowed,
        now,
        uuid.UUID(user.sub),
        uuid.UUID(user.sub),
        now,
    )

    await db.execute(
        "UPDATE assessment_catalog SET availability_state = 'TRIAL', updated_at = NOW() WHERE id = $1",
        uuid.UUID(catalog_id),
    )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="CREATE",
        entity_type="assessment_trial",
        entity_id=str(row["id"]),
        metadata={
            "instrument": catalog["name"],
            "trial_source": body.trial_source,
            "real_patient_use_allowed": body.real_patient_use_allowed,
            "expiry_date": str(body.expiry_date),
            "maximum_administrations": body.maximum_administrations,
        },
    )

    return TrialOut(**trial_service.trial_to_dict(row, catalog["name"]))


@router.get("/admin/assessment-catalog/{catalog_id}/trial", response_model=TrialOut | None)
async def get_trial(catalog_id: str, user: TrialViewer, db: DB):
    row = await db.fetchrow(
        """
        SELECT t.*, ac.name AS instrument_name
        FROM assessment_trials t
        JOIN assessment_catalog ac ON ac.id = t.catalog_id
        WHERE t.catalog_id = $1 AND t.org_id = $2
        ORDER BY t.created_at DESC
        LIMIT 1
        """,
        uuid.UUID(catalog_id),
        uuid.UUID(user.org_id),
    )
    if not row:
        return None
    data = trial_service.trial_to_dict(row, row["instrument_name"])
    # Lazily flip a lapsed trial so the counter never lies to the clinician.
    if data["status"] == "expired" and row["status"] == "active":
        await _mark_expired(db, str(row["id"]), user.org_id)
    return TrialOut(**data)


async def _mark_expired(db: DB, trial_id: str, org_id: str) -> None:
    await db.execute(
        """
        UPDATE assessment_trials
        SET status = 'expired', expired_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'active'
        """,
        uuid.UUID(trial_id),
    )
    await db.execute(
        """
        UPDATE assessment_catalog SET availability_state = 'RESERVED', updated_at = NOW()
        WHERE id = (SELECT catalog_id FROM assessment_trials WHERE id = $1)
          AND availability_state = 'TRIAL'
        """,
        uuid.UUID(trial_id),
    )


@router.post("/admin/assessment-trials/{trial_id}/administrations", status_code=201)
async def record_administration(
    trial_id: str,
    body: TrialAdministrationIn,
    user: TrialViewer,
    db: DB,
):
    """Records one administration and decrements the allowance. Refuses
    once the trial is expired or its cap is reached."""
    trial = await _trial_or_404(db, org_id=user.org_id, trial_id=trial_id)

    try:
        trial_service.assert_can_administer(
            trial, user_id=user.sub, is_real_patient=body.was_real_patient
        )
    except trial_service.TrialError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    # Only the normalised outcome is persisted -- never item content.
    await db.execute(
        """
        INSERT INTO trial_administrations
            (id, trial_id, administered_by, result_source, was_real_patient, normalized_result)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb)
        """,
        uuid.uuid4(),
        uuid.UUID(trial_id),
        uuid.UUID(user.sub),
        body.result_source,
        body.was_real_patient,
        json.dumps({"severity": body.severity, "topics": body.topics}),
    )

    row = await db.fetchrow(
        """
        UPDATE assessment_trials
        SET administrations_used = administrations_used + 1, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        """,
        uuid.UUID(trial_id),
    )

    data = trial_service.trial_to_dict(row, trial.get("instrument_name", ""))
    if trial_service.is_expired(dict(row)):
        await _mark_expired(db, trial_id, user.org_id)
        data["status"] = "expired"

    return {
        "recorded": True,
        "administrations_remaining": data["administrations_remaining"],
        "days_remaining": data["days_remaining"],
        "status": data["status"],
        "expiry_actions": trial_service.expiry_actions(dict(row))
        if data["status"] == "expired"
        else None,
    }


@router.post("/assessment-recommendations")
async def recommend_from_result(body: NormalizedResultIn, user: TrialViewer, db: DB):
    """Demonstrates the recommendation pipeline from a NORMALISED result.

    Deliberately takes only severity + topics, so it works identically for
    a synthetic trial result and a real licensed one, and never needs the
    instrument's protected questions or scoring keys.
    """
    rows = await db.fetch(
        "SELECT id, title, author, category, description, file_url, tags FROM resources WHERE org_id = $1",
        uuid.UUID(user.org_id),
    )
    resources = []
    for r in rows:
        item = dict(r)
        item["id"] = str(item["id"])
        tags = item.get("tags")
        item["tags"] = json.loads(tags) if isinstance(tags, str) else (tags or [])
        resources.append(item)

    return trial_service.recommendation_from_normalized(body, resources)


@router.post(
    "/admin/assessment-catalog/{catalog_id}/license",
    response_model=LicenseOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_license(
    catalog_id: str,
    body: LicenseConversionIn,
    user: TrialManager,
    db: DB,
    trial_id: str | None = None,
):
    """'Convert Trial to Licensed'. Submitting evidence opens a compliance
    review -- it does NOT activate the instrument. Approval is a separate,
    deliberate administrator action."""
    catalog = await _catalog_or_404(db, org_id=user.org_id, catalog_id=catalog_id)

    row = await db.fetchrow(
        """
        INSERT INTO assessment_licenses (
            id, catalog_id, org_id, trial_id, license_reference, licensed_organization,
            publisher, proof_document_url, qualified_users, permitted_instrument,
            permitted_version, permitted_languages, permitted_territories,
            embedding_rights, administration_limit, valid_from, valid_until,
            data_retention_terms, status, created_by
        ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb,$13::jsonb,
            $14,$15,$16,$17,$18,'pending_review',$19
        )
        RETURNING id, catalog_id, license_reference, licensed_organization, publisher,
                  status, compliance_reviewed_by, compliance_reviewed_at, compliance_notes,
                  valid_from, valid_until, created_at
        """,
        uuid.uuid4(),
        uuid.UUID(catalog_id),
        uuid.UUID(user.org_id),
        uuid.UUID(trial_id) if trial_id else None,
        body.license_reference,
        body.licensed_organization,
        body.publisher,
        body.proof_document_url,
        json.dumps(body.qualified_users),
        body.permitted_instrument,
        body.permitted_version,
        json.dumps(body.permitted_languages),
        json.dumps(body.permitted_territories),
        body.embedding_rights,
        body.administration_limit,
        body.valid_from,
        body.valid_until,
        body.data_retention_terms,
        uuid.UUID(user.sub),
    )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="CREATE",
        entity_type="assessment_license",
        entity_id=str(row["id"]),
        metadata={
            "instrument": catalog["name"],
            "license_reference": body.license_reference,
            "licensed_organization": body.licensed_organization,
            "status": "pending_review",
        },
    )

    data = dict(row)
    data["id"] = str(data["id"])
    data["catalog_id"] = str(data["catalog_id"])
    data["compliance_reviewed_by"] = (
        str(data["compliance_reviewed_by"]) if data.get("compliance_reviewed_by") else None
    )
    return LicenseOut(**data)


@router.post("/admin/assessment-licenses/{license_id}/review", response_model=LicenseOut)
async def review_license(license_id: str, body: ComplianceReviewIn, user: TrialManager, db: DB):
    """Administrator compliance review. This -- and only this -- promotes an
    instrument to LICENSED_ACTIVE."""
    existing = await db.fetchrow(
        "SELECT * FROM assessment_licenses WHERE id = $1 AND org_id = $2",
        uuid.UUID(license_id),
        uuid.UUID(user.org_id),
    )
    if not existing:
        raise HTTPException(status_code=404, detail="License record not found.")
    if existing["status"] != "pending_review":
        raise HTTPException(
            status_code=409, detail=f"This license is already {existing['status']}."
        )

    new_status = "approved" if body.approve else "rejected"
    row = await db.fetchrow(
        """
        UPDATE assessment_licenses
        SET status = $1, compliance_reviewed_by = $2, compliance_reviewed_at = NOW(),
            compliance_notes = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, catalog_id, license_reference, licensed_organization, publisher,
                  status, compliance_reviewed_by, compliance_reviewed_at, compliance_notes,
                  valid_from, valid_until, created_at
        """,
        new_status,
        uuid.UUID(user.sub),
        body.notes,
        uuid.UUID(license_id),
    )

    if body.approve:
        await db.execute(
            """
            UPDATE assessment_catalog
            SET availability_state = 'LICENSED_ACTIVE', license_status = 'LICENSED', updated_at = NOW()
            WHERE id = $1
            """,
            existing["catalog_id"],
        )
        if existing["trial_id"]:
            await db.execute(
                "UPDATE assessment_trials SET status = 'converted', updated_at = NOW() WHERE id = $1",
                existing["trial_id"],
            )

    await write_audit_log(
        db,
        org_id=user.org_id,
        actor_user_id=user.sub,
        action="UPDATE",
        entity_type="assessment_license",
        entity_id=license_id,
        metadata={
            "status": new_status,
            "notes": body.notes,
            "promoted_to_licensed_active": bool(body.approve),
        },
    )

    data = dict(row)
    data["id"] = str(data["id"])
    data["catalog_id"] = str(data["catalog_id"])
    data["compliance_reviewed_by"] = (
        str(data["compliance_reviewed_by"]) if data.get("compliance_reviewed_by") else None
    )
    return LicenseOut(**data)
