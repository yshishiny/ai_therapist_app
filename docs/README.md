# AI Therapist Platform Docs

This folder is the planning and delivery backbone for the AI Therapist platform.

## Documents
- product-vision.md
- target-architecture.md
- domain-model.md
- api-roadmap.md
- db-migration-plan.md
- sprint-roadmap.md
- delivery-governance.md

## Operating model
- GitHub is the source of truth for code, architecture, and technical decisions.
- Asana is the source of truth for sprint execution, ownership, blockers, and progress.
- organisations remains the tenant boundary in the current platform.

# AI Therapist Platform

AI Therapist is evolving from a clinician-and-patient application into a multi-tenant therapist SaaS platform for clinical practices.

## What this repository now represents
This repository contains the active product codebase and delivery backbone for the platform extension, including:
- Practice Admin workflows
- Clinician and Patient experiences
- FastAPI backend and PostgreSQL schema evolution
- Flutter application workspaces
- architecture, roadmap, and migration planning under `/docs`

## Product direction
The platform is being extended to support:
- policy-based access control
- patient-clinician assignment
- versioned assessments and question banks
- protected content and IP controls for books, guidelines, and tools
- subscription and usage billing
- audit and compliance foundations

## Core user roles
- Platform Admin
- Practice Admin
- Supervisor
- Clinician
- Patient

## Current stack
- **Backend:** FastAPI + PostgreSQL
- **Frontend:** Flutter
- **Deployment:** Railway
- **AI integrations:** OpenAI-compatible providers / LM Studio compatible workflows

## Delivery roadmap
- **Sprint 0:** documentation backbone, milestones, labels, release flow
- **Sprint 1:** access foundation, permissions, patient-clinician assignment, Practice Admin shell
- **Sprint 2:** assessment administration v2
- **Sprint 3:** content/IP controls
- **Sprint 4:** billing and subscriptions
- **Sprint 5:** audit and hardening

See:
- `docs/product-vision.md`
- `docs/target-architecture.md`
- `docs/domain-model.md`
- `docs/api-roadmap.md`
- `docs/db-migration-plan.md`
- `docs/sprint-roadmap.md`
- `docs/delivery-governance.md`
- `docs/codex-workspace-brief.md`

## Quick start
```bash
# Start services
docker-compose up -d

# API available at
http://localhost:8001

# Check health
curl http://localhost:8001/health
Working model
GitHub is the source of truth for code, architecture, pull requests, and technical decisions
Asana is the source of truth for sprint execution, owners, blockers, and progress tracking
New platform work should move through feature branches and pull requests
Deployment
This backend is structured to deploy via Railway when reviewed changes are merged.
Required environment variables
DATABASE_URL
OPENAI_API_KEY (optional depending on AI features)
ENVIRONMENT
License
Private - All rights reserved

And yes, the project direction this README reflects is already backed by the docs added in the repo and the Sprint 0 delivery governance work.

