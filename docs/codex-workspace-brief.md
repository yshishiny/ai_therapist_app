# Codex Workspace Brief

## Project Objective

Extend AI Therapist from a clinician and patient application with light admin tooling into a multi-tenant therapist SaaS platform.

This is an in-place evolution of the existing product, not a rewrite.

The outcome should add:

- practice administration
- fine-grained permissions and visibility control
- patient-to-clinician assignment management
- versioned assessments
- secure IP-aware content delivery
- subscription and usage billing foundations
- audit and compliance foundations

## Current Stack

### Backend

- Python
- FastAPI
- PostgreSQL
- asyncpg
- JWT authentication
- modular backend code already emerging under `backend/src/`

### Frontend

- Flutter
- existing app under `ai_therapist/`
- Provider-based state in existing flows
- API-driven role-aware routing

## Existing Foundations To Preserve

These already exist and must be extended rather than replaced:

- JWT auth with role-aware routing
- roles:
  - `ADMIN`
  - `CLINICIAN`
  - `SUPERVISOR`
  - `PATIENT`
- org-scoped access and IDOR protection
- admin dashboard foundations
- patient portal `/me/*` flows
- assessment templates and submission flow
- resource CRUD APIs for books, handouts, and articles
- PostgreSQL-backed schema for:
  - organisations
  - clinicians
  - patients
  - resources
  - assessments
  - homework
  - sessions
  - care plans

## Target Architecture Summary

### Product Layers

#### Platform Layer

Used by the company.

Responsibilities:

- tenant onboarding
- subscription lifecycle
- plan management
- metered usage
- licensed catalog control
- global feature flags

#### Practice Admin Layer

Used by clinic owner or practice administrator.

Responsibilities:

- clinician management
- patient assignment
- access rules
- assessment catalog management
- content library visibility
- billing visibility
- audit visibility

#### Clinician Layer

Used by therapists and supervisors.

Responsibilities:

- assigned patient list
- allowed assessments only
- allowed content only
- homework and session workflows
- reports and trends

#### Patient Layer

Used by patient.

Responsibilities:

- assigned assessments
- homework
- AI companion
- mood and progress
- assigned content only

### Backend Direction

Use a modular monolith and organize domains around:

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

`backend/app.py` should become a thin composition root only.

### Frontend Direction

Extend the Flutter app with:

- platform admin features
- practice admin features
- clinician capability-driven screens
- patient flows that remain backward compatible
- backend-driven capability visibility rather than hardcoded frontend assumptions

## Sprint Roadmap

### Sprint 1

- permissions schema and seeds
- access-control service
- clinician groups
- patient-clinician assignments
- audit log base
- admin permissions screens

### Sprint 2

- assessment catalog
- assessment versioning
- question-bank bulk upload
- branch rules
- publish flow
- clinician assessment entitlements
- clinician assessment catalog screen

### Sprint 3

- content items and versions
- IP policy table
- entitlement rules
- secure content delivery
- admin content screen
- clinician content library filtering

### Sprint 4

- subscription plans
- tenant subscriptions
- usage events
- billing admin dashboard
- AI usage metering

### Sprint 5

- audit screens
- export endpoints
- permission hardening
- end-to-end tests
- production readiness review

## Non-Negotiable Rules

- Backend is the source of truth for permissions.
- `organisations` remains the tenant boundary.
- Do not rewrite the current product from scratch.
- Keep backward compatibility for current patient portal and assessment submission flows during migration.
- Do not expose raw content file URLs in public responses.
- Assessment logic must not live only in Flutter widgets.
- Every admin write action must emit an audit event.
- Use additive migrations for early releases unless there is an explicit cleanup phase.
- Do not assume screen visibility equals authorization.

## First Implementation Target For Sprint 1

Codex should begin with the access foundation only.

The first coding target is:

1. create the access-control migration and seed permissions
2. add reusable backend permission resolution helpers
3. add clinician groups and patient-clinician assignments
4. add audit-log writes for admin changes
5. add practice-admin Flutter entry screens and services that compile against the new endpoints

This first target should unlock later assessment, content, and billing work without breaking the current app.

## Backend Files To Create First

- `backend/migrations/001_access_foundation.sql`
- `backend/access_control/schemas.py`
- `backend/access_control/service.py`
- `backend/access_control/routes.py`
- `backend/patients/assignment_schemas.py`
- `backend/patients/assignment_routes.py`
- `backend/core/dependencies_access.py`

## Backend Files To Update First

- `backend/app.py`
- `backend/schema.sql`
- `backend/auth.py`

## Frontend Files To Create First

- `ai_therapist/lib/features/practice_admin/practice_admin_home.dart`
- `ai_therapist/lib/features/practice_admin/clinicians_screen.dart`
- `ai_therapist/lib/features/practice_admin/patients_admin_screen.dart`
- `ai_therapist/lib/services/permission_service.dart`
- `ai_therapist/lib/services/patient_assignment_service.dart`

## Frontend Files To Update First

- `ai_therapist/lib/main.dart`
- `ai_therapist/lib/core/api_client.dart`
- `ai_therapist/lib/features/dashboard/admin_dashboard_screen.dart`

## Definition Of Done

Sprint 1 is done only when:

1. admin can fetch the permission catalog
2. admin can set allow and deny overrides per user
3. admin can assign a patient to a clinician
4. admin can list a clinician's assigned patients
5. every permission override and patient assignment writes to `audit_log`
6. admin lands on `PracticeAdminHome`
7. new admin services compile against live endpoints
8. existing patient and clinician flows remain unchanged
9. all new admin endpoints remain org-scoped
10. cross-org patient or clinician assignment is blocked
