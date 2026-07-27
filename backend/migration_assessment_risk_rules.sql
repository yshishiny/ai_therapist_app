-- Risk detection rules (e.g. PHQ-9 item 9 suicide-risk flag) deserve to be
-- a distinct, queryable field rather than buried inside interpretation_rules
-- or definition_json — safety-critical logic should be easy to find and audit.

ALTER TABLE assessment_versions ADD COLUMN IF NOT EXISTS risk_rules JSONB;
