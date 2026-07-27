-- Some catalog entries (e.g. a clinician's own translated/adapted clinical
-- materials) should be visible only to that clinician and org admins, not
-- the whole org. NULL owner_user_id = normal org-wide visibility
-- (unchanged behavior for every existing row); a non-null owner scopes the
-- entry to that one clinician.

ALTER TABLE assessment_catalog ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES clinicians(id);
