# Codex Handoff Comment

Use this as the current GitHub handoff summary for Codex-based continuation.

## Context

The repo is moving from a clinician and patient application with light admin tooling into a multi-tenant therapist SaaS platform.

This is an extension of the current Flutter + FastAPI + PostgreSQL product, not a rewrite.

Preserve:

- JWT auth and role-aware routing
- org-scoped access and IDOR protection
- patient portal `/me/*` flows
- current assessment submission flow
- existing resource CRUD foundations

## Architecture Direction

Build as a modular monolith with these backend domains:

- `auth`
- `tenants`
- `access_control`
- `clinicians`
- `patients`
- `assessments`
- `content_library`
- `patient_portal`
- `billing`
- `audit`
- `notifications`
- `ai`

`backend/app.py` should become a thin composition root over time.

## Immediate Next Sprint

Sprint 1 is the access foundation only:

- permissions schema and seeds
- access-control service
- clinician groups
- patient-clinician assignments
- audit-log base
- admin permission screens

Do not start billing, secure content delivery, or assessment versioning in this task.

## Exact First Task

Codex should start from:

- `docs/codex-first-task.md`

That file contains the narrow executable Sprint 1 scope, exact files, endpoints, acceptance criteria, and compatibility constraints.

## Recommended Execution Order

1. Add `001_access_foundation.sql`
2. Add `access_control` backend module and permission helper dependency
3. Add patient-clinician assignment routes and audit logging
4. Wire new routers into `backend/app.py`
5. Add practice-admin Flutter services and screens
6. Route `ADMIN` users into the new practice-admin entry point
7. Validate that patient and clinician flows still behave as before

## Non-Negotiable Rules

- Backend is the source of truth for authorization.
- `organisations` remains the tenant boundary.
- Every admin write must emit an audit event.
- Keep all new endpoints org-scoped.
- Keep current patient portal and assessment submission flows backward compatible during migration.
- Do not expose raw protected content URLs in later sprints.
