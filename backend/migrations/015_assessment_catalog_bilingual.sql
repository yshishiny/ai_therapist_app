-- The assessment content inside definition_json is already bilingual via the
-- text/text_ar field convention, but the catalog-level title and category are
-- plain English TEXT, so the UI's EN/AR toggle can't translate assessment
-- names or category headers. These columns close that gap at the catalog level.

ALTER TABLE assessment_catalog ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE assessment_catalog ADD COLUMN IF NOT EXISTS category_ar TEXT;
