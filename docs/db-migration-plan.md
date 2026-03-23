# Database Migration Plan

## Principles
- Keep organisations as the tenant boundary
- Add new tables in phases
- Preserve backward compatibility with current patient and clinician flows
- Avoid breaking current assessment submission flows during migration

## Migration order

### Migration 001 - Access foundation
- permissions
- role_permissions
- user_permissions
- clinician_groups
- clinician_group_members
- patient_clinician_assignments
- audit_log enhancements if needed

### Migration 002 - Assessment admin v2
- assessment_catalog
- assessment_versions
- assessment_question_bank
- assessment_branch_rules
- clinician_assessment_entitlements
- patient_assessment_assignments

### Migration 003 - Content and IP
- content_items
- content_versions
- content_ip_policies
- content_entitlements
- content_access_logs

### Migration 004 - Billing
- subscription_plans
- tenant_subscriptions
- usage_events
- invoices

## Rollout rule
Each migration must be deployed with compatible API changes and smoke-tested in staging before production.
