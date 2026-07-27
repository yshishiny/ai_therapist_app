# Migrations

Every schema change to this database goes here, and only here.

## Running them

```bash
python backend/migrate.py --status     # what is applied, what is pending
python backend/migrate.py --apply      # apply everything pending
```

Connection comes from `DATABASE_URL`, or `DATABASE_HOST` + `DB_PASSWORD`
(plus optional `DB_USER`, `DB_NAME`) like the other scripts in `backend/`.

## Rules

**Never edit a migration that has been applied.** The runner stores a
checksum of every file it applies and reports files that changed afterwards.
An applied migration is a historical record of what a database was actually
subjected to; changing it makes environments silently diverge. Add a new
migration instead.

**Number sequentially and never renumber.** `NNN_short_description.sql`,
applied in filename order.

**Make them idempotent where you reasonably can** — `ADD COLUMN IF NOT
EXISTS`, `CREATE TABLE IF NOT EXISTS`. The ledger already prevents
re-running, but idempotence makes recovery from a partial failure easier.

**Each file runs in its own transaction.** A failure rolls that file back and
stops the run; earlier files stay applied. So keep one logical change per
file, and don't rely on a later file to repair an earlier one.

## Adopting an existing database

A database that already had these changes applied by hand:

```bash
python backend/migrate.py --baseline    # records them as applied, runs no SQL
```

Production was baselined this way on 2026-07-27 at migration 019.

## An empty database

`--apply` detects an empty database and lays down `backend/schema.sql` as the
baseline before running the migrations. `schema.sql` is the starting point,
not a migration — do not add new changes to it.

## What this replaced

Seventeen `migration_*.sql` files sat loose in `backend/`, applied by nothing.
The only runner in the repo, `run_migration.py`, dropped every table in the
public schema and replayed `schema.sql` plus one migration; its comment said
"DB currently has no real data", which had stopped being true long before.
No environment's schema state was knowable. That script is now disabled and
there is deliberately no reset command.

## Known drift

Production is missing `patient_clinician_assignments` (from
`004_access_foundation.sql`) and the surrogate `id` / `created_at` columns on
`permissions` / `user_permissions`. Verified harmless: no application code
references that table, and `user_permissions` is written by
`(user_id, permission_key, effect)`. Recorded here rather than silently
patched, because production predates this tooling and a change to live
permission tables deserves a deliberate decision.
