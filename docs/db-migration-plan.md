# DB Migration Plan

## Migration strategy
Evolve the current schema in controlled phases without breaking the patient portal or existing clinician workflows.

## Principles
- Reuse `organisations` as the tenant boundary
- Add new tables before redirecting old flows
- Preserve backward compatibility during rollout
- Keep migrations small and reversible where practical
- Emit audit events for sensitive admin changes

## Release 1 — Access foundation
- permissions
- role_permissions
- user_permissions
- clinician_groups
- clinician_group_members
- patient_clinician_assignments
- audit log enhancements

## Release 2 — Assessment administration v2
- assessment_catalog
- assessment_versions
- assessment_question_bank
- assessment_branch_rules
- clinician_assessment_entitlements
- patient_assessment_assignments

## Release 3 — Content and IP
- content_items
- content_versions
- content_ip_policies
- content_entitlements
- content_access_logs

## Release 4 — Billing and governance
- subscription_plans
- tenant_subscriptions
- usage_events
- invoices
- export and governance support tables as needed

## Rollout note
Keep adapters in the backend so existing resource and assessment flows can continue to work while the new model is being introduced.
