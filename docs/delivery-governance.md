# Delivery Governance

## Source of truth
- GitHub for code, docs, branches, pull requests, and technical decisions
- Asana for sprint execution, owners, due dates, blockers, and progress tracking

## Repository model
- Main working repository: yshishiny/ai_therapist_app
- Planning and architecture docs live in /docs
- New platform work should start on feature branches and merge through pull requests

## Suggested GitHub labels
- epic
- backend
- frontend
- db
- infra
- security
- assessment
- admin-portal
- patient-portal
- billing
- blocked

## Suggested milestones
- Sprint 0 - Setup
- Sprint 1 - Access Foundation
- Sprint 2 - Assessment Admin v2
- Sprint 3 - Content, Billing, and Governance
- Sprint 4 - Platform Admin and Expansion
- Sprint 5 - Audit and Hardening

## Branch and release flow
- main for production-ready code
- short-lived feature branches for implementation
- pull request review before merge
- deploy to staging before production

## Minimum definition of done
- code merged by pull request
- tests added or updated
- docs updated if architecture or API changes
- Asana task status updated
- deployment notes captured for risky changes
