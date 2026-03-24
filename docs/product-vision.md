# Product Vision

## Product direction
AI Therapist is evolving from a clinician-and-patient application into a multi-tenant therapist SaaS platform.

## Core goals
- Provide a practice administration portal for therapist owners and clinic admins
- Support clinician, supervisor, admin, and patient experiences
- Enable patient-clinician linking and controlled patient portal access
- Support assessment authoring, versioning, permissions, and assignment
- Support protected content such as books, guidelines, and tools with IP-aware controls
- Monetize through subscriptions, add-ons, and usage-based billing
- Provide auditability and governance for operational and compliance needs

## Primary user groups
- Platform Admin: manages tenants, plans, feature flags, licensing
- Practice Admin: manages clinicians, patients, permissions, content, assessments, billing visibility
- Clinician: works with assigned patients, approved assessments, and allowed tools
- Supervisor: sees team patients and supervisory controls
- Patient: completes assessments, homework, AI companion workflows, and assigned content

## Product principles
- Backend is the source of truth for authorization
- Organisations remain the tenant boundary
- New architecture extends the current codebase instead of replacing it
- Patient flows must remain simple and safe
- Protected content must never be exposed through raw public URLs
- Assessment logic must be versioned and manageable by admin workflows

## Target business model
- Base subscription by therapist or practice
- Metered usage for AI-heavy actions
- Add-ons for premium assessments, premium content, and advanced administration
