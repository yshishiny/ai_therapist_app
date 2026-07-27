-- ============================================================
-- AI Therapist — Migration v2
-- Run this in Railway dashboard → Postgres → Query tab
-- OR via psql: psql $DATABASE_URL -f migration_v2.sql
-- ============================================================

-- Resources (books, handouts, articles)
CREATE TABLE IF NOT EXISTS resources (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    uploaded_by  UUID NOT NULL REFERENCES clinicians(id),
    title        TEXT NOT NULL,
    author       TEXT,
    category     TEXT NOT NULL DEFAULT 'BOOK',
    description  TEXT,
    file_url     TEXT,
    tags         JSONB NOT NULL DEFAULT '[]',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_org ON resources (org_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources (org_id, category);

-- Contacts (referrers, GPs, specialists)
CREATE TABLE IF NOT EXISTS contacts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    full_name    TEXT NOT NULL,
    email        TEXT,
    phone        TEXT,
    role         TEXT DEFAULT 'REFERRER',
    organisation TEXT,
    notes        TEXT,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts (org_id);

-- Assessment Questions (custom question bank)
CREATE TABLE IF NOT EXISTS assessment_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    assessment_id   TEXT NOT NULL,
    question_index  INTEGER NOT NULL,
    question_text   TEXT NOT NULL,
    response_type   TEXT NOT NULL DEFAULT 'LIKERT',
    options         JSONB,
    reverse_scored  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (org_id, assessment_id, question_index)
);
CREATE INDEX IF NOT EXISTS idx_aq_assessment ON assessment_questions (org_id, assessment_id);

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('resources','contacts','assessment_questions')
ORDER BY table_name;
