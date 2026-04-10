# Delivery Governance

## Operating model
- GitHub is the source of truth for code, architecture, issues, and technical decisions
- Asana is the source of truth for sprint execution, ownership, blockers, and progress follow-up
- Work is delivered in phased sprints with explicit acceptance criteria

## Branching and release flow
- `main` is protected and production-oriented
- feature branches for all implementation work
- pull requests required before merge
- staging validation before production release

## Environments
- Development
- Staging
- Production

## Minimum delivery controls
- Architecture changes documented in `/docs`
- All schema changes tracked via migrations
- All admin/security-sensitive changes include audit coverage
- New APIs require basic tests
- Frontend must not assume authorization from hidden UI alone

## Definition of done
A deliverable is done only when:
- code is merged
- migration is reviewed if applicable
- basic tests pass
- docs are updated
- acceptance criteria are satisfied
- release impact is understood

## Reporting cadence
- Weekly sprint review
- Weekly blocker review
- Sprint demo for completed admin/platform functionality
