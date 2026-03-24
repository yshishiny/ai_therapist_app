# Target Architecture

## Target state
Extend the current application into a multi-tenant therapist SaaS platform with four layers:
- Platform layer
- Practice Admin layer
- Clinician layer
- Patient layer

## Core architectural decisions
- Keep the current stack and evolve it: Flutter + FastAPI + PostgreSQL
- Keep `organisations` as the tenant boundary
- Move to policy-based access control on the backend
- Split assessments into catalog, version, question-bank, rule, and assignment concerns
- Replace simple resources with IP-aware content management
- Add subscription and usage billing as a separate backend domain

## Backend domain modules
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

## Frontend applications/areas
- Platform Admin
- Practice Admin
- Clinician Workspace
- Patient Portal

## Non-negotiable rules
- Backend is source of truth for permissions
- No raw public URLs for protected content
- Every admin write action emits an audit event
- Existing patient flows remain backward compatible during migration
