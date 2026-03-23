# API Roadmap

## Phase 1 - Access foundation
- GET /admin/permissions
- GET /admin/users/{user_id}/permissions
- POST /admin/users/{user_id}/permissions
- POST /admin/patient-assignments
- PATCH /admin/patient-assignments/{assignment_id}
- GET /admin/clinicians/{clinician_id}/patients

## Phase 2 - Assessment administration
- POST /admin/assessments
- GET /admin/assessments
- PATCH /admin/assessments/{assessment_id}
- POST /admin/assessments/{assessment_id}/versions
- POST /admin/assessment-versions/{version_id}/questions/bulk
- POST /admin/assessment-versions/{version_id}/branch-rules
- POST /admin/assessment-versions/{version_id}/publish
- POST /admin/assessment-entitlements
- GET /clinician/me/assessment-catalog

## Phase 3 - Content and IP
- POST /admin/content
- GET /admin/content
- PATCH /admin/content/{content_id}
- POST /admin/content/{content_id}/versions
- POST /admin/content/{content_id}/ip-policy
- POST /admin/content/{content_id}/entitlements
- GET /content/library
- GET /content/{content_id}/access-token

## Phase 4 - Billing and governance
- GET /admin/billing/subscription
- GET /admin/billing/usage
- GET /admin/billing/invoices
- GET /admin/audit
- GET /admin/audit/{event_id}
