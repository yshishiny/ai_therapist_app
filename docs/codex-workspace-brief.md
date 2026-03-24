# Codex Workspace Brief

## Project
AI Therapist Platform

## Repository
`yshishiny/ai_therapist_app`

## Objective
Extend the current AI Therapist application into a multi-tenant therapist SaaS platform with:
- Practice Admin portal
- policy-based access control
- patient-clinician assignment
- versioned assessments
- content and IP controls for books, guidelines, and tools
- subscription and usage billing
- audit and compliance foundations

## Current stack
- Flutter frontend
- FastAPI backend
- PostgreSQL database

## Existing foundations to preserve
- JWT auth and role-aware routing
- roles for Admin, Clinician, Supervisor, and Patient
- patient portal and patient-scoped endpoints
- existing assessments and admin CRUD flows
- org-scoped access model using `organisations`

## Target architecture summary
### Backend domains
- auth
- tenants
- access_control
- clinicians
- patients
- assessments
- content_library
- patient_portal
- billing
- audit
- notifications
- ai

### Frontend areas
- Practice Admin
- Clinician Workspace
- Patient Portal
- future Platform Admin

## Non-negotiable rules
- `organisations` remains the tenant boundary
- backend is the source of truth for authorization
- no raw public URLs for protected content
- every admin write action emits an audit event
- migration must remain backward compatible for current patient flows

## Delivery roadmap
### Sprint 0
- docs backbone
- milestones, labels, issues
- branch strategy
- environment strategy

### Sprint 1
- permissions, role_permissions, user_permissions
- clinician groups
- patient_clinician_assignments
- access-control service and admin endpoints
- Practice Admin shell UI

### Sprint 2
- assessment_catalog
- assessment_versions
- question bank bulk upload
- branch rules
- publish flow
- clinician assessment entitlements
- new assessment admin UI

### Sprint 3
- content_items and content_versions
- content_ip_policies
- content_entitlements
- content_access_logs
- secure content delivery

### Sprint 4
- subscription_plans
- tenant_subscriptions
- usage_events
- invoices
- billing admin screens

### Sprint 5
- audit viewer
- export support
- hardening and E2E coverage

## First implementation target
Start with Sprint 1 only.

### Sprint 1 tables
- permissions
- role_permissions
- user_permissions
- clinician_groups
- clinician_group_members
- patient_clinician_assignments
- audit_log improvements

### Sprint 1 backend files to add
- `backend/migrations/001_access_foundation.sql`
- `backend/access_control/schemas.py`
- `backend/access_control/service.py`
- `backend/access_control/routes.py`
- `backend/core/dependencies_access.py`
- `backend/patients/assignment_schemas.py`
- `backend/patients/assignment_routes.py`

### Sprint 1 frontend files to add
- `ai_therapist/lib/features/practice_admin/practice_admin_home.dart`
- `ai_therapist/lib/features/practice_admin/clinicians_screen.dart`
- `ai_therapist/lib/features/practice_admin/patients_admin_screen.dart`
- `ai_therapist/lib/services/permission_service.dart`
- `ai_therapist/lib/services/patient_assignment_service.dart`

## Definition of done
A task is done only when:
- code is merged
- migrations are reviewed if applicable
- tests pass
- docs are updated
- acceptance criteria are met
