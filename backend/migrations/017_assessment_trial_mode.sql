-- ============================================================
-- Controlled Trial Mode for licensed/restricted assessments
-- ============================================================
-- Formalises the four-state lifecycle for instruments we do not
-- own the rights to, so that "we are evaluating this" can never
-- silently become "we are using this on patients".
--
--   RESERVED             metadata only; awaiting license or publisher approval
--   EDUCATIONAL_PREVIEW  public descriptions + synthetic examples only
--   TRIAL                time-limited evaluation, authorised content only
--   LICENSED_ACTIVE      real clinical use under a verified license
--
-- Instruments that are genuinely free/public-domain keep the
-- existing behaviour and sit at AVAILABLE -- this whole mechanism
-- only governs the restricted ones.
-- ============================================================

ALTER TABLE assessment_catalog
    ADD COLUMN IF NOT EXISTS availability_state TEXT NOT NULL DEFAULT 'AVAILABLE';

-- Backfill from the existing license_status so nothing changes meaning:
-- the 7 reserved slots (Beck/Hamilton/MMPI/MBI) become RESERVED.
UPDATE assessment_catalog
   SET availability_state = 'RESERVED'
 WHERE license_status = 'LICENSE_REQUIRED'
   AND availability_state = 'AVAILABLE';

CREATE INDEX IF NOT EXISTS idx_catalog_availability
    ON assessment_catalog (availability_state);


-- ── Trials ─────────────────────────────────────────────────
-- One row per authorised evaluation of one instrument by one org.
CREATE TABLE IF NOT EXISTS assessment_trials (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id                UUID NOT NULL REFERENCES assessment_catalog(id) ON DELETE CASCADE,
    org_id                    UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

    -- Where the trial content is allowed to come from. There is no
    -- option here that means "copy the real instrument ourselves".
    --   publisher_sandbox  official publisher trial/sandbox access
    --   authorized_demo    publisher demo forms / written permission
    --   synthetic          fictional items authored for training only
    trial_source              TEXT NOT NULL
        CHECK (trial_source IN ('publisher_sandbox', 'authorized_demo', 'synthetic')),
    publisher                 TEXT,
    authorization_reference   TEXT,          -- required unless trial_source = 'synthetic'

    organization              TEXT NOT NULL DEFAULT '',
    approved_users            JSONB NOT NULL DEFAULT '[]',   -- clinician ids permitted to administer

    start_date                DATE NOT NULL,
    expiry_date               DATE NOT NULL,
    maximum_administrations   INTEGER NOT NULL DEFAULT 0,    -- 0 = none permitted until set
    administrations_used      INTEGER NOT NULL DEFAULT 0,

    allowed_country           TEXT,
    allowed_language          TEXT,

    -- Permissions default to the most restrictive value. Widening any of
    -- these is an explicit act recorded against an authorization_reference.
    real_patient_use_allowed  BOOLEAN NOT NULL DEFAULT false,
    report_export_allowed     BOOLEAN NOT NULL DEFAULT false,
    content_storage_allowed   BOOLEAN NOT NULL DEFAULT false,
    result_storage_allowed    BOOLEAN NOT NULL DEFAULT false,

    terms_accepted_at         TIMESTAMP WITH TIME ZONE,
    terms_accepted_by         UUID REFERENCES clinicians(id),

    status                    TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'converted')),
    expired_at                TIMESTAMP WITH TIME ZONE,

    created_by                UUID REFERENCES clinicians(id),
    created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- A trial without publisher authorisation may only ever be synthetic.
    CONSTRAINT trial_requires_authorization CHECK (
        trial_source = 'synthetic' OR authorization_reference IS NOT NULL
    ),
    -- Synthetic content is fictional, so it can never touch a real patient.
    CONSTRAINT synthetic_never_real_patients CHECK (
        trial_source <> 'synthetic' OR real_patient_use_allowed = false
    ),
    CONSTRAINT trial_dates_ordered CHECK (expiry_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_trials_catalog ON assessment_trials (catalog_id);
CREATE INDEX IF NOT EXISTS idx_trials_org_status ON assessment_trials (org_id, status);

-- Only one live trial per instrument per org.
CREATE UNIQUE INDEX IF NOT EXISTS idx_trials_one_live_per_catalog
    ON assessment_trials (catalog_id, org_id)
    WHERE status IN ('pending', 'active');


-- ── Trial administrations ──────────────────────────────────
-- Audit trail. Deliberately stores ONLY the normalised result
-- (severity + topics) -- never item text, item scores, or any
-- publisher scoring key.
CREATE TABLE IF NOT EXISTS trial_administrations (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_id           UUID NOT NULL REFERENCES assessment_trials(id) ON DELETE CASCADE,
    administered_by    UUID REFERENCES clinicians(id),
    administered_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    result_source      TEXT NOT NULL
        CHECK (result_source IN ('synthetic', 'publisher_trial')),
    was_real_patient   BOOLEAN NOT NULL DEFAULT false,
    normalized_result  JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_trial_admin_trial ON trial_administrations (trial_id);


-- ── Licenses ───────────────────────────────────────────────
-- Uploading a document does NOT grant access. A row lands as
-- 'pending_review' and only an administrator's compliance review
-- can approve it, which is what flips the catalog to LICENSED_ACTIVE.
CREATE TABLE IF NOT EXISTS assessment_licenses (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id               UUID NOT NULL REFERENCES assessment_catalog(id) ON DELETE CASCADE,
    org_id                   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    trial_id                 UUID REFERENCES assessment_trials(id),   -- set when converted from a trial

    license_reference        TEXT NOT NULL,
    licensed_organization    TEXT NOT NULL,
    publisher                TEXT,
    proof_document_url       TEXT,

    qualified_users          JSONB NOT NULL DEFAULT '[]',
    permitted_instrument     TEXT,
    permitted_version        TEXT,
    permitted_languages      JSONB NOT NULL DEFAULT '[]',
    permitted_territories    JSONB NOT NULL DEFAULT '[]',
    embedding_rights         BOOLEAN NOT NULL DEFAULT false,
    administration_limit     INTEGER,
    valid_from               DATE,
    valid_until              DATE,
    data_retention_terms     TEXT,

    status                   TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'approved', 'rejected', 'expired')),
    compliance_reviewed_by   UUID REFERENCES clinicians(id),
    compliance_reviewed_at   TIMESTAMP WITH TIME ZONE,
    compliance_notes         TEXT,

    created_by               UUID REFERENCES clinicians(id),
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_catalog ON assessment_licenses (catalog_id);
CREATE INDEX IF NOT EXISTS idx_licenses_org_status ON assessment_licenses (org_id, status);


-- ── BSS special rule ───────────────────────────────────────
-- Beck Scale for Suicide Ideation: trials default to synthetic
-- clinician-training scenarios only. Real-patient trial use stays
-- prohibited unless a publisher authorisation AND a clinical
-- governance approval are both recorded.
ALTER TABLE assessment_catalog
    ADD COLUMN IF NOT EXISTS requires_governance_approval BOOLEAN NOT NULL DEFAULT false;

UPDATE assessment_catalog
   SET requires_governance_approval = true
 WHERE template_key = 'bss';
