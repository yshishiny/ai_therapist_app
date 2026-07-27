from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class MaterialUploadOut(BaseModel):
    id: str
    original_filename: str
    status: str
    ocr_text: str | None = None
    parsed_definition_json: dict[str, Any] | None = None
    restricted_instrument_match: str | None = None
    error_message: str | None = None
    catalog_id: str | None = None
    version_id: str | None = None
    created_at: datetime
    updated_at: datetime


class MaterialUploadEditIn(BaseModel):
    name: str | None = None
    definition_json: dict[str, Any] | None = None
    scoring_rules: dict[str, Any] | None = None
    interpretation_rules: dict[str, Any] | None = None
