# Target Architecture

## Target state
A multi-tenant clinical SaaS platform with four layers:
- Platform layer
- Practice admin layer
- Clinical layer
- Patient layer

## Platform layer
Responsibilities:
- Tenant setup
- Subscription plans
- Usage metering
- Catalog licensing
- Feature flags

## Practice admin layer
Responsibilities:
- Clinician management
- Patient assignment
- Access and visibility control
- Assessment administration
- Content administration
- Billing visibility
- Audit visibility

## Clinical layer
Responsibilities:
- Assigned patient workflows
- Entitled assessments
- Entitled content
- Homework, sessions, and reports

## Patient layer
Responsibilities:
- Assigned assessments
- Homework
- Progress tracking
- Patient-scoped content and AI tools

## Technical direction
- Flutter clients
- FastAPI backend
- PostgreSQL persistence
- Modular monolith backend
- Policy-based access control
- Versioned assessment engine
- IP-aware content delivery
