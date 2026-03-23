# Product Vision

## Product name
AI Therapist Platform

## Mission
Build a multi-tenant clinical SaaS platform that helps therapists and clinics manage patients, assessments, content, homework, AI-assisted workflows, and secure patient engagement.

## Product direction
The current application already supports therapist and patient experiences. The next stage is to evolve it into a therapist-facing SaaS product with:
- practice administration
- clinician and supervisor permissions
- patient-clinician assignment
- versioned assessments
- secure content library for books, guidelines, and tools
- subscription and usage-based monetization
- audit and compliance foundations

## Primary user groups
1. Platform Admin
   - manages tenants, plans, global catalog, licensing
2. Practice Admin
   - manages clinicians, patients, permissions, assessments, content, billing visibility
3. Clinician / Supervisor
   - manages assigned patients, homework, assessments, progress and reporting
4. Patient
   - completes assessments, homework, progress tracking, AI companion access

## Core product capabilities
- tenant-aware data isolation using organisations as the tenant boundary
- policy-based access control on top of current role-based access
- clinician-level entitlement control for assessments and content
- protected content delivery for IP-sensitive books and resources
- patient-scoped portal with linked clinician workflows
- billing with base subscriptions plus metered usage

## Success outcomes
- therapists can buy and operate the product as a practice platform
- admins can decide who sees which sections and tools
- patients only access assigned content and tasks
- premium content and assessments can be monetized safely
- product growth can continue without rewriting the existing stack

## Non-goals for the first expansion phase
- microservices rewrite
- full enterprise white-labeling in Sprint 1
- external marketplace launch in Sprint 1
- advanced analytics before access-control and assessment governance are stable
