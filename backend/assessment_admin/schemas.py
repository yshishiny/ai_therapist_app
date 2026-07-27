from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AssessmentCatalogCreateIn(BaseModel):
    template_key: str
    name: str | None = None
    template_type: str | None = None
    category: str | None = None
    license_status: str = "VERIFY"
    description: str | None = None
    legacy_template_id: str | None = None


class AssessmentCatalogUpdateIn(BaseModel):
    name: str | None = None
    template_type: str | None = None
    license_status: str | None = None
    description: str | None = None
    is_active: bool | None = None


class AssessmentCatalogOut(BaseModel):
    id: str
    template_key: str
    legacy_template_id: str | None = None
    name: str
    template_type: str | None = None
    category: str | None = None
    license_status: str | None = None
    description: str | None = None
    is_active: bool
    current_published_version_id: str | None = None
    current_published_version_number: int | None = None
    owner_user_id: str | None = None
    created_at: datetime
    updated_at: datetime


class AssessmentVersionCreateIn(BaseModel):
    name: str | None = None
    template_type: str | None = None
    license_status: str | None = None
    definition_json: dict[str, Any] | list[Any] | None = None
    scoring_rules: dict[str, Any] | list[Any] | None = None
    interpretation_rules: dict[str, Any] | list[Any] | None = None
    risk_rules: dict[str, Any] | list[Any] | None = None
    delivery: str = "IN_APP"
    google_form_url: str | None = None
    notes: str | None = None


class AssessmentVersionOut(BaseModel):
    id: str
    catalog_id: str
    version_number: int
    status: str
    name: str
    template_type: str | None = None
    license_status: str | None = None
    definition_json: dict[str, Any] | list[Any] | None = None
    scoring_rules: dict[str, Any] | list[Any] | None = None
    interpretation_rules: dict[str, Any] | list[Any] | None = None
    risk_rules: dict[str, Any] | list[Any] | None = None
    delivery: str | None = None
    google_form_url: str | None = None
    notes: str | None = None
    created_at: datetime
    published_at: datetime | None = None
