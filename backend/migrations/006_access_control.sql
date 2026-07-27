-- Access control + assessment catalog/versioning + audit trail additions
-- Wires up backend/access_control and backend/assessment_admin, which existed
-- as unused code with no matching schema.

BEGIN;

-- audit_log was missing org_id/event_type — access_control writes both.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS org_id UUID;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS event_type TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log (org_id);

-- Permission catalog (global, not org-scoped — same key set for every tenant)
CREATE TABLE IF NOT EXISTS permissions (
    key TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

-- Default permissions granted per role
CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL,
    permission_key TEXT NOT NULL REFERENCES permissions (key) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_key)
);

-- Per-user ALLOW/DENY overrides on top of the role defaults
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id UUID NOT NULL,
    permission_key TEXT NOT NULL REFERENCES permissions (key) ON DELETE CASCADE,
    effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, permission_key)
);

-- Clinician groups (for group-based visibility, per spec 4.3)
CREATE TABLE IF NOT EXISTS clinician_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS clinician_group_members (
    group_id UUID NOT NULL REFERENCES clinician_groups (id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES clinicians (id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, clinician_id)
);

-- Assessment catalog: org-scoped, wraps either a legacy assessment_templates
-- row or a fully custom assessment, tracking which version is live.
CREATE TABLE IF NOT EXISTS assessment_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations (id) ON DELETE CASCADE,
    template_key TEXT NOT NULL,
    legacy_template_id TEXT REFERENCES assessment_templates (id),
    name TEXT NOT NULL,
    template_type VARCHAR(30),
    license_status VARCHAR(20) DEFAULT 'VERIFY',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    current_published_version_id UUID,
    created_by UUID REFERENCES clinicians (id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (org_id, template_key)
);

-- Draft/published/archived versions of a catalog entry's content + scoring.
CREATE TABLE IF NOT EXISTS assessment_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES assessment_catalog (id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    name TEXT NOT NULL,
    template_type VARCHAR(30),
    license_status VARCHAR(20),
    definition_json JSONB,
    scoring_rules JSONB,
    interpretation_rules JSONB,
    delivery VARCHAR(20) DEFAULT 'IN_APP',
    google_form_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES clinicians (id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES clinicians (id),
    UNIQUE (catalog_id, version_number)
);

-- assessment_catalog.current_published_version_id and assessment_versions.id
-- are mutually referential, so the FK is added after both tables exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'assessment_catalog_current_version_fkey'
    ) THEN
        ALTER TABLE assessment_catalog
            ADD CONSTRAINT assessment_catalog_current_version_fkey
            FOREIGN KEY (current_published_version_id)
            REFERENCES assessment_versions (id);
    END IF;
END $$;

-- Baseline permission set (idempotent).
INSERT INTO permissions (key, description) VALUES
    ('patients.view', 'View patient records'),
    ('patients.manage', 'Create, edit, and archive patients'),
    ('assessments.view', 'View assessment results'),
    ('assessments.assign', 'Assign assessments to patients'),
    ('assessment_catalog.manage', 'Create/edit/publish assessment catalog entries'),
    ('content_library.view', 'View content library items'),
    ('content_library.manage', 'Upload and manage content library items'),
    ('billing.view', 'View clinic billing and usage'),
    ('access_control.manage', 'Manage clinician permissions and groups'),
    ('audit.view', 'View audit log')
ON CONFLICT (key) DO NOTHING;

-- Default role -> permission grants (idempotent).
INSERT INTO role_permissions (role, permission_key) VALUES
    ('admin', 'patients.view'),
    ('admin', 'patients.manage'),
    ('admin', 'assessments.view'),
    ('admin', 'assessments.assign'),
    ('admin', 'assessment_catalog.manage'),
    ('admin', 'content_library.view'),
    ('admin', 'content_library.manage'),
    ('admin', 'billing.view'),
    ('admin', 'access_control.manage'),
    ('admin', 'audit.view'),
    ('supervisor', 'patients.view'),
    ('supervisor', 'patients.manage'),
    ('supervisor', 'assessments.view'),
    ('supervisor', 'assessments.assign'),
    ('supervisor', 'content_library.view'),
    ('supervisor', 'audit.view'),
    ('clinician', 'patients.view'),
    ('clinician', 'assessments.view'),
    ('clinician', 'assessments.assign'),
    ('clinician', 'content_library.view')
ON CONFLICT DO NOTHING;

COMMIT;
