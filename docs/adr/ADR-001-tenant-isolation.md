# ADR-001: Tenant isolation model

**Status:** Proposed
**Date:** 2026-07-27
**Deciders:** Platform owner (Yasser), clinical lead (Dr. Heba)

## Context

This is multi-tenant SaaS: several practices share one Postgres database, and a
clinician must never see another practice's patients. Today that guarantee is
enforced inconsistently.

Of 33 tables, **18 carry `org_id` directly**, **8 derive tenancy only through a
join**, and 7 are global reference data (permissions, `organisations`, technique
libraries) where no tenant column is expected.

The 8 join-scoped tables:

| Table | Tenancy derived via |
| --- | --- |
| `appointments` | `patients.org_id` |
| `session_notes` | `patients.org_id` |
| `care_plans` | `patients.org_id` |
| `clinical_profiles` | `patients.org_id` |
| `risk_flags` | `patients.org_id` |
| `assessment_versions` | `assessment_catalog.org_id` |
| `clinician_group_members` | `clinicians.org_id` |
| `trial_administrations` | `assessment_trials.org_id` |

Every query against these must remember to join the parent and filter on it.
Nothing in the schema enforces that. A single forgotten `WHERE p.org_id = $1`
leaks one practice's clinical records to another — the most serious failure this
product can have.

### This is not hypothetical. It has failed three times in one working session:

1. **Two patient records** (`Amira`, `Demo`) were stranded in an empty legacy
   tenant and invisible to the practice that owned them.
2. **91 knowledge-base resources** were written to the wrong tenant, because an
   ingestion script picked "the organisation with the oldest `created_at`" —
   which is a leftover empty `Default Clinic`. Every recommendation silently
   returned nothing.
3. **`appointments` has no `org_id` at all.** Tenant scoping runs *entirely*
   through `patients.org_id` via an INNER JOIN. This blocked a real feature: a
   documentation or supervision block has no patient, therefore no tenant, and
   could not even be listed. The Scheduler work is currently adding `org_id` to
   that one table ad hoc.

### Still-stranded rows found while writing this ADR

| Table | Correct tenant | Legacy empty tenant |
| --- | --- | --- |
| `homework_tasks` | 0 | **3** |
| `sessions` | 10 | **2** |
| `patient_users` | 1 | **1** |

These are live production rows that belong to no active practice. Nobody
noticed, because nothing checks.

The common root cause is not carelessness. It is that **the correct behaviour is
not the default**: writing a correct query requires remembering an invariant the
database does not express.

## Decision

Adopt **`org_id` as a mandatory, non-null column on every tenant-scoped table**,
with a foreign key to `organisations`, and filter directly on it in every query.
Treat the join-derived pattern as a defect to be migrated away from.

Additionally, add **Postgres Row-Level Security as a second layer** once the
column work is complete, so that a forgotten filter fails closed rather than
leaking.

## Options Considered

### Option A: Status quo — derive tenancy through joins, rely on review

| Dimension | Assessment |
| --- | --- |
| Complexity | Low (no change) |
| Cost | Zero upfront, high ongoing |
| Safety | **Poor** — no structural guarantee |
| Team familiarity | High |

**Pros:** No migration. Strictly normalised — tenancy stated once.
**Cons:** Already failed three times. Cannot represent a tenant-scoped row with
no parent (the `appointments` blocker). Every new query is a fresh chance to leak.
Reviewer attention is the only control, and this codebase is largely
agent-written, where that control is weakest.

### Option B: `org_id` on every tenant-scoped table (**recommended**)

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium — 8 tables to migrate and backfill |
| Cost | One migration + query updates |
| Safety | Good — filter is local, no join required |
| Team familiarity | High — already the pattern in 18 of 26 tables |

**Pros:** Makes the majority pattern universal instead of two-thirds. Removes the
"parentless row" impossibility that is blocking calendar blocks. Enables a cheap
`NOT NULL` constraint and a periodic orphan check. Simpler, faster queries — no
join needed purely for scoping.

**Cons:** Denormalised: `org_id` is duplicated, so a patient transferred between
practices requires updating children. (In practice patients do not move between
practices; if it ever happens it is a deliberate, auditable operation.) Backfill
must be right, and a wrong backfill is silent.

### Option C: Row-Level Security with a session variable

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium-High — policies plus connection-pool discipline |
| Cost | Moderate |
| Safety | **Strongest** — database refuses to return other tenants' rows |
| Team familiarity | Low — new to this codebase |

**Pros:** Fails closed. A forgotten `WHERE` returns nothing instead of everything.
Defence in depth against exactly the mistakes already made.

**Cons:** Requires `SET LOCAL app.current_org` on every checkout from the asyncpg
pool; a missed `SET` breaks reads rather than leaking, but still breaks them.
Interacts awkwardly with admin/cross-tenant tooling and with the platform-admin
portal, which legitimately reads across tenants. Still needs Option B's column to
write a policy against most of these tables.

### Option D: Database or schema per tenant

| Dimension | Assessment |
| --- | --- |
| Complexity | High |
| Cost | High — connection and migration overhead per tenant |
| Safety | Very strong — physical separation |
| Team familiarity | Low |

**Pros:** Hard isolation. Simple mental model. Per-tenant backup and restore.
**Cons:** Disproportionate here. The instance is a `db-f1-micro` capped at 25
connections; a pool per tenant is immediately infeasible. Every migration must
run N times. This is a small number of practices, not a compliance-driven
enterprise deployment.

## Trade-off Analysis

The real choice is B versus C, and they are complementary rather than exclusive:
**C is not implementable for the 8 join-scoped tables until B gives them a column
to write a policy against.** So B is on the critical path regardless.

B alone leaves the failure mode "developer forgets the filter" open — it makes
correct code easier to write but still not automatic. C closes that, at the cost
of pool discipline and a carve-out for the platform-admin portal's legitimate
cross-tenant reads.

D is rejected as disproportionate to the deployment size, and directly
incompatible with the current 25-connection Cloud SQL tier.

A alone is rejected: three failures in one session, one of which structurally
blocked a feature, is sufficient evidence that discipline is not working. The
codebase is largely agent-authored, and an invariant that lives only in
reviewers' heads is the first thing lost at that scale.

## Consequences

**Easier:** Scoping queries becomes a local `WHERE a.org_id = $1` with no join.
Tenant-scoped rows with no patient (documentation blocks, supervision, admin
time) become representable. An orphan check becomes a one-line query per table.

**Harder:** `org_id` must be set on every insert — a new failure mode if
forgotten, mitigated by `NOT NULL`. Denormalised data can drift if a parent's
tenant ever changes.

**To revisit:** Whether to proceed to RLS after the column work lands, and how
the platform-admin portal's cross-tenant reads are carved out of any policy.

## Action Items

1. [ ] Add `org_id` to the 8 join-scoped tables, backfilled from the parent, then
       `NOT NULL` + FK + index. (`appointments` is already in flight via the
       Scheduler work — fold it into this migration rather than leaving it
       one-off.)
2. [ ] Repatriate the stranded rows: 3 `homework_tasks`, 2 `sessions`,
       1 `patient_users` currently in the empty `Default Clinic`.
3. [ ] Decide the fate of the legacy `Default Clinic` organisation — delete it,
       or mark it inactive so no script can select it again.
4. [ ] Replace "pick an organisation" heuristics in seed/ingest scripts with an
       explicit, required `SEED_ORG_ID`. The resource mis-filing came from a
       script guessing.
5. [ ] Add a startup or CI check that fails when any tenant-scoped table has rows
       whose `org_id` is null or points at an inactive organisation.
6. [ ] Evaluate RLS as a follow-up ADR once (1) is complete.
