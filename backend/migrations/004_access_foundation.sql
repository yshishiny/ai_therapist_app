BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT NOT NULL,
    permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
    PRIMARY KEY (role, permission_key)
);

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
    effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, permission_key)
);

CREATE TABLE IF NOT EXISTS clinician_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS clinician_group_members (
    group_id UUID NOT NULL REFERENCES clinician_groups(id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, clinician_id)
);

CREATE TABLE IF NOT EXISTS patient_clinician_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_primary_clinician_per_patient
    ON patient_clinician_assignments(patient_id)
    WHERE is_primary = TRUE AND status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_pca_org_clinician
    ON patient_clinician_assignments(org_id, clinician_id, status);

CREATE INDEX IF NOT EXISTS idx_pca_org_patient
    ON patient_clinician_assignments(org_id, patient_id, status);

ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS event_type TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
    ON audit_log(org_id, created_at DESC);

INSERT INTO permissions (key, description)
VALUES
    ('assessment.catalog.view', 'View assessment catalog'),
    ('assessment.catalog.manage', 'Manage assessment catalog'),
    ('assessment.version.publish', 'Publish assessment versions'),
    ('assessment.assign', 'Assign assessments to patients'),
    ('resource.view', 'View content and resources'),
    ('resource.manage', 'Manage content and resources'),
    ('content.share_to_patient', 'Share content to patient portal'),
    ('patient.view.assigned', 'View assigned patients'),
    ('patient.view.all', 'View all patients in organisation'),
    ('billing.view', 'View billing pages'),
    ('billing.manage', 'Manage billing settings'),
    ('audit.view', 'View audit events')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
VALUES
    ('admin', 'assessment.catalog.view'),
    ('admin', 'assessment.catalog.manage'),
    ('admin', 'assessment.version.publish'),
    ('admin', 'assessment.assign'),
    ('admin', 'resource.view'),
    ('admin', 'resource.manage'),
    ('admin', 'content.share_to_patient'),
    ('admin', 'patient.view.assigned'),
    ('admin', 'patient.view.all'),
    ('admin', 'billing.view'),
    ('admin', 'billing.manage'),
    ('admin', 'audit.view'),
    ('supervisor', 'assessment.catalog.view'),
    ('supervisor', 'assessment.assign'),
    ('supervisor', 'resource.view'),
    ('supervisor', 'patient.view.assigned'),
    ('clinician', 'assessment.catalog.view'),
    ('clinician', 'assessment.assign'),
    ('clinician', 'resource.view'),
    ('clinician', 'patient.view.assigned')
ON CONFLICT DO NOTHING;

COMMIT;
