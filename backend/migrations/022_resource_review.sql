-- ============================================================
-- Citation review: a clinician's decision on each library item
-- ============================================================
-- The content library holds 91 items. 33 of them -- the whole Addiction topic
-- -- were never citation-checked: the agent that collected them wrote the file
-- and its audit never ran, so nobody has confirmed those titles, authors or
-- claims are real. The tags array already says which are checked
-- ('verified' / 'unverified'), but that records what the collector claimed,
-- not what a clinician found. There was nowhere to put a decision.
--
--   review_status  UNREVIEWED        nobody has looked at it yet
--                  CONFIRMED         checked: the item is real and described
--                                    accurately
--                  NEEDS_CORRECTION  real, but the title/author/description is
--                                    wrong and must be fixed
--                  REJECTED          not real, or does not belong in the library
--   reviewed_by    the clinician who made the call
--   reviewed_at    when they made it
--   review_note    what they found -- the correction, or why it was rejected
--
-- The CHECK is deliberate: an arbitrary string in this column would make the
-- review counts silently wrong. The API validates the same four values and
-- answers 400, so this constraint should never be the thing that fires.
-- ============================================================

ALTER TABLE resources
    ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'UNREVIEWED',
    ADD COLUMN IF NOT EXISTS reviewed_by   UUID REFERENCES clinicians(id),
    ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS review_note   TEXT;

-- ADD CONSTRAINT has no IF NOT EXISTS, and this file must stay re-runnable
-- against a database that was baselined by hand.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'resources_review_status_check'
    ) THEN
        ALTER TABLE resources
            ADD CONSTRAINT resources_review_status_check
            CHECK (review_status IN ('UNREVIEWED','CONFIRMED','NEEDS_CORRECTION','REJECTED'));
    END IF;
END
$$;

-- "Show me everything still unreviewed in my practice" is the whole workflow,
-- so it gets the index.
CREATE INDEX IF NOT EXISTS idx_resources_review_status
    ON resources (org_id, review_status);
