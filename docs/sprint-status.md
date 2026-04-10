# Sprint Status

> Date: 2026-03-26
> Recommended active sprint: Sprint 2 - Assessment Admin v2

## Current Status

The repo is carrying two timelines:

- a product roadmap for the existing clinician and patient application
- a platform roadmap for the newer multi-tenant SaaS expansion

After checking the docs, implementation, and backend tests, the clearest read is:

1. the clinician and patient product foundation is already substantial
2. Sprint 1 platform access foundations are implemented
3. the next sprint should be Sprint 2, not a restart of Sprint 1

## Confirmed Complete

- core auth flows including login, refresh, and logout
- org-scoped patient APIs and patient portal `/me/*` APIs
- dashboard, assessments, scheduling, homework, AI chat, and report generation
- PDF export and recent security hardening
- Sprint 1 access foundation:
  - permissions schema
  - permission resolution helpers
  - clinician groups
  - patient-clinician assignments
  - audit-log writes for admin changes
  - Practice Admin shell screens

## Open Risks And Carryover

- `TASKS.md` is stale and does not reflect the current roadmap
- the repo had an unresolved merge conflict in `docs/codex-workspace-brief.md`
- operational launch work still needs tracking:
  - production migration execution
  - end-to-end auth/device validation
  - remaining medium-severity hardening items
- `backend/app.py` is still too large and should keep shrinking as platform work continues

## Sprint 2 Recommendation

Sprint 2 should focus on versioned assessment administration, not on broad new product scope.

Sprint goal:
- make assessments manageable as a governed catalog with versioning and entitlement-aware visibility

Priority backlog:
- add `assessment_catalog`
- add `assessment_versions`
- support bulk question-bank import
- implement publish flow and publish-state checks
- enforce clinician assessment entitlements
- add Practice Admin assessment catalog screens

Out of scope unless blocking:
- billing
- secure content delivery
- broad frontend rewrites
- unrelated patient portal feature work

## Verification

- backend tests: `43 passed`
- reviewed planning docs, access-control routes, assignment routes, migration SQL, and Flutter Practice Admin shell
