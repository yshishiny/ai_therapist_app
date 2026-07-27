-- Tracks clinician-uploaded documents through OCR -> AI structuring -> review
-- -> publish. The resulting draft always lands in the existing
-- assessment_catalog / assessment_versions tables (status='draft') so
-- review/edit/publish reuses the assessment_admin endpoints already built
-- -- this table is only the upload/processing audit trail, not a second
-- content store.

CREATE TABLE IF NOT EXISTS material_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id),
    uploaded_by UUID NOT NULL,
    original_filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded'
        CHECK (status IN ('uploaded', 'ocr_running', 'ocr_failed', 'parsing', 'parse_failed', 'ready_for_review', 'published')),
    ocr_text TEXT,
    ocr_confidence REAL,
    parsed_definition_json JSONB,
    restricted_instrument_match TEXT,
    error_message TEXT,
    catalog_id UUID REFERENCES assessment_catalog(id),
    version_id UUID REFERENCES assessment_versions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_uploads_org ON material_uploads(org_id);
