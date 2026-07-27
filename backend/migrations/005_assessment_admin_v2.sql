CREATE TABLE IF NOT EXISTS assessment_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    template_key TEXT NOT NULL,
    legacy_template_id TEXT REFERENCES assessment_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    template_type VARCHAR(30),
    license_status VARCHAR(20) DEFAULT 'VERIFY',
    description TEXT,
    current_published_version_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES clinicians(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, template_key)
);

CREATE TABLE IF NOT EXISTS assessment_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES assessment_catalog(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    name TEXT NOT NULL,
    template_type VARCHAR(30),
    license_status VARCHAR(20) DEFAULT 'VERIFY',
    definition_json JSONB,
    scoring_rules JSONB,
    interpretation_rules JSONB,
    delivery VARCHAR(20) DEFAULT 'IN_APP',
    google_form_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES clinicians(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES clinicians(id),
    UNIQUE (catalog_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_assessment_catalog_org
    ON assessment_catalog (org_id, template_key);
CREATE INDEX IF NOT EXISTS idx_assessment_versions_catalog
    ON assessment_versions (catalog_id, version_number DESC);
