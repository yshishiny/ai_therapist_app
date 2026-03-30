# Codex First Task

## Sprint 1 Scope

Build the access-control foundation for the therapist SaaS extension without breaking the current app.

Sprint 1 includes only:

1. permissions schema and seeds
2. access-control service and reusable permission dependency helpers
3. clinician groups
4. patient-clinician assignments
5. audit-log base for admin write actions
6. practice-admin Flutter entry screens and service wiring

Do not start assessment versioning, content delivery, or billing in this task.
Do not replace the current patient portal or clinician flows.

## Exact Files To Generate

### Backend

- `backend/migrations/001_access_foundation.sql`
- `backend/access_control/schemas.py`
- `backend/access_control/service.py`
- `backend/access_control/routes.py`
- `backend/patients/assignment_schemas.py`
- `backend/patients/assignment_routes.py`
- `backend/core/dependencies_access.py`

### Backend Files To Update

- `backend/app.py`
- `backend/schema.sql`
- `backend/auth.py`

### Frontend

- `ai_therapist/lib/features/practice_admin/practice_admin_home.dart`
- `ai_therapist/lib/features/practice_admin/clinicians_screen.dart`
- `ai_therapist/lib/features/practice_admin/patients_admin_screen.dart`
- `ai_therapist/lib/services/permission_service.dart`
- `ai_therapist/lib/services/patient_assignment_service.dart`

### Frontend Files To Update

- `ai_therapist/lib/main.dart`
- `ai_therapist/lib/core/api_client.dart`
- `ai_therapist/lib/features/dashboard/admin_dashboard_screen.dart`

## SQL Migration Target

Create `backend/migrations/001_access_foundation.sql` as an additive migration.

It must create:

- `permissions`
- `role_permissions`
- `user_permissions`
- `clinician_groups`
- `clinician_group_members`
- `patient_clinician_assignments`
- `audit_log`

It must seed these permission keys:

- `assessment.catalog.view`
- `assessment.catalog.manage`
- `assessment.version.publish`
- `assessment.assign`
- `resource.view`
- `resource.manage`
- `content.share_to_patient`
- `patient.view.assigned`
- `patient.view.all`
- `billing.view`
- `billing.manage`
- `audit.view`

It must keep `organisations` as the tenant boundary and add only forward-compatible indexes and constraints.

## API Endpoints

Sprint 1 must implement these endpoints first.

### Access Admin

- `GET /admin/permissions`
- `GET /admin/users/{user_id}/permissions`
- `POST /admin/users/{user_id}/permissions`
- `GET /admin/roles`
- `POST /admin/clinician-groups`
- `POST /admin/clinician-groups/{group_id}/members`
- `DELETE /admin/clinician-groups/{group_id}/members/{clinician_id}`

### Patient Assignment

- `POST /admin/patient-assignments`
- `PATCH /admin/patient-assignments/{assignment_id}`
- `DELETE /admin/patient-assignments/{assignment_id}`
- `GET /admin/clinicians/{clinician_id}/patients`
- `GET /admin/patients/{patient_id}/care-team`

### Existing Auth Dependency

All endpoints must keep using the current JWT auth model and org-scoped request identity.

## Acceptance Criteria

### Backend

- admin can fetch the permission catalog
- admin can fetch effective permissions for a user
- admin can set allow or deny overrides per user
- admin can create clinician groups and manage members
- admin can assign a patient to a clinician
- admin can update or end an assignment
- admin can list a clinician's assigned patients
- every permission override and patient assignment change writes to `audit_log`

### Frontend

- admin lands on `PracticeAdminHome`
- admin can navigate to clinician and patient admin tabs
- Flutter services compile against the new endpoints
- existing patient and clinician flows remain unchanged

### Security

- all new admin endpoints are org-scoped
- cross-org patient or clinician assignment is blocked
- backend enforces authorization even if the UI hides nothing
- permission resolution follows:
  - tenant scope
  - role
  - role permissions
  - user overrides
  - assignment rule
  - entitlement rule
  - IP policy
  - feature flag

## Constraints For Backward Compatibility

- preserve the existing JWT auth model and token claims
- preserve current patient portal flows and `/me/*` endpoints
- preserve current assessment submission behavior during migration
- do not rewrite the old admin stack from scratch in one pass
- do not expose authorization decisions only in Flutter
- do not delete existing modules until new ones are proven
- keep migrations additive during Sprint 1
- reuse `organisations` as the tenant boundary

## Definition Of Done

Sprint 1 is done when the branch contains:

- the access-control migration and seeds
- reusable permission dependency helpers
- clinician group and patient assignment endpoints
- audit logging for the new admin write paths
- practice-admin entry screens and service wiring in Flutter
- no regression in existing patient or clinician flows
