# Domain Model

## Tenant boundary
- `organisations` is the tenant boundary

## Primary actors
- Platform Admin
- Practice Admin
- Supervisor
- Clinician
- Patient

## Core entities

### Identity and access
- users
- roles
- permissions
- role_permissions
- user_permissions
- clinician_groups
- clinician_group_members

### Clinical relationships
- clinicians
- patients
- patient_clinician_assignments
- care teams

### Assessments
- assessment_catalog
- assessment_versions
- assessment_question_bank
- assessment_branch_rules
- clinician_assessment_entitlements
- patient_assessment_assignments
- assessment_submissions

### Content and IP
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
- consent records
- export jobs

## Core rules
- A patient belongs to one organisation
- A clinician belongs to one organisation
- Patient-clinician assignment must be org-scoped
- Assessment visibility is controlled by role, permission, entitlement, and tenant scope
- Content visibility is controlled by role, permission, entitlement, and IP policy
- Billing is managed per organisation
