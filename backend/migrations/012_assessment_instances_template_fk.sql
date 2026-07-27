-- assessment_instances.template_id used to hard-FK into the legacy
-- assessment_templates table. Instrument content now also lives in
-- assessment_catalog (org-scoped, versioned) and a template_id can
-- legitimately reference either source -- a single FK can't express
-- "one of two tables," so referential integrity for this column is
-- enforced at the application layer (assessment_repository_db_real's
-- _resolve_instrument) instead, same pattern already used for
-- assessment_catalog.legacy_template_id being nullable/optional.

ALTER TABLE assessment_instances DROP CONSTRAINT IF EXISTS assessment_instances_template_id_fkey;
