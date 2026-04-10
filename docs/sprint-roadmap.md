# Sprint Roadmap

## Sprint 0 — Setup
Goal: establish the delivery backbone.

Deliverables:
- docs structure in GitHub
- milestone plan
- labels and issue templates
- branch strategy and release rules
- environment definition: dev, staging, prod
- initial backlog grouped by epics

## Sprint 1 — Access Foundation
Goal: introduce policy and assignment foundations.

Deliverables:
- permissions, role_permissions, user_permissions
- clinician groups
- patient_clinician_assignments
- access-control service and admin endpoints
- audit logging for admin access changes
- Practice Admin shell in the frontend

## Sprint 2 — Assessment Admin v2
Goal: make assessments versioned, assignable, and manageable.

Deliverables:
- assessment_catalog
- assessment_versions
- question bank bulk upload
- branch rules
- publish flow
- clinician assessment entitlements
- new assessment admin UI

## Sprint 3 — Content and IP
Goal: secure books, guidelines, and tools.

Deliverables:
- content_items and content_versions
- IP policy rules
- entitlement rules
- secure access-token delivery
- content admin UI and clinician filtering

## Sprint 4 — Billing and Subscription
Goal: enable monetization and entitlement control.

Deliverables:
- plans and tenant subscriptions
- usage events
- invoice summaries
- billing screens
- backend-managed feature entitlements

## Sprint 5 — Audit and Hardening
Goal: make the platform governance-ready.

Deliverables:
- audit viewer
- export/reporting support
- production hardening
- E2E tests for admin, clinician, and patient flows
