-- ============================================================
-- Mark organisations active/inactive
-- ============================================================
-- Per docs/adr/ADR-001-tenant-isolation.md, action item 3.
--
-- A leftover empty "Default Clinic" predates the real practice. Seed and
-- ingest scripts that pick an organisation by "oldest created_at" selected
-- it and silently filed data against a tenant with no users -- that is how
-- 91 knowledge-base resources became invisible.
--
-- Rather than delete the row (irreversible, and it may carry historical
-- meaning), give organisations an explicit active flag so scripts and
-- queries have something to filter on. Deactivating is reversible; a
-- DELETE is not.
-- ============================================================

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Deactivate any organisation that holds no clinicians and no patients.
-- Written as a rule rather than a hardcoded id so it stays correct if the
-- ids differ between environments.
UPDATE organisations o
   SET active = false
 WHERE NOT EXISTS (SELECT 1 FROM clinicians c WHERE c.org_id = o.id)
   AND NOT EXISTS (SELECT 1 FROM patients  p WHERE p.org_id = o.id);

CREATE INDEX IF NOT EXISTS idx_organisations_active ON organisations (active);
