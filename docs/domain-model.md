# Domain Model

## Tenant boundary
- organisation

## User roles
- admin
- clinician
- supervisor
- patient
- platform admin (future)

## Core domains

### Identity and access
- users
- roles
- permissions
- role_permissions
- user_permissions
- clinician_groups

### Clinical relationships
- clinicians
- patients
- patient_clinician_assignments
- care_teams

### Assessments
- assessment_catalog
- assessment_versions
- assessment_question_bank
- assessment_branch_rules
- clinician_assessment_entitlements
- patient_assessment_assignments
- assessment_submissions

### Content library
- content_items
- content_versions
- content_ip_policies
- content_entitlements
- content_access_logs

### Billing
- subscription_plans
- tenant_subscriptions
- usage_events
- invoices

### Governance
- audit_log
- consent_records
- data_exports

## Design rule
Every secured action is evaluated by:
- organisation scope
- role
- permission
- assignment
- entitlement
- IP policy
- feature flag
