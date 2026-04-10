---
name: AI Therapist project status
description: Current state of the AI Therapist app — completed features, in-progress fixes, and pending roadmap items
type: project
---

## Stack
- Flutter mobile app (`ai_therapist/lib/`) — version 1.0.2+3
- FastAPI backend (`backend/app.py`) deployed on Railway
- PostgreSQL on Railway
- GitHub repo: `yshishiny/ai_therapist_app`
- Active branch: `roadmap`

## Production Accounts (Railway DB)
| Role | Email | Password |
|---|---|---|
| Admin/Therapist | shishiny@gmail.com | Qwerty67. |
| Clinician | heba.moustafa5@gmail.com | Qwerty67. |
| Patient | test@test.com | Qwerty67. |

## Completed Features (all sprints)
- Full auth (clinician + patient JWT, token revocation, logout)
- Clinician dashboard: patient list, folder (5 tabs), AI clinical report + PDF export
- Assessment engine: PHQ-9, GAD-7, PSS-10, WHO-5, PCL-5, PID-5, FEATS, PPAT, Metahealth, Reflexology, body map, art therapy upload
- Patient portal: mood check-in, homework, AI chat, progress charts, session scheduling
- Security: IDOR fixes, PHI encryption (AES-256), global exception handler, correlation-ID middleware, pagination, rate limiting by user ID
- FCM push notifications (new session + homework assignment)
- CI/CD: Railway deploy + GitHub Actions APK build on `main` and `roadmap`

## CI/CD Status (as of 2026-03-23)
- **Backend CI**: ✅ passing — deploys to Railway on every push to `roadmap`
- **APK Build**: ⏳ in progress — fl_chart pinned to ^0.66.0, Flutter pinned to 3.29.0
  - Previous failures: compileSdk mismatch, fl_chart 1.x incompatible with vector_math 2.1.4

## APK Download
Once CI passes: GitHub → Actions → Build Release APK → Artifacts → `AITherapist-release-vN`

## GitHub Issues Status
- #1–#5 CRITICAL/HIGH: all FIXED
- #6 Rate limiter by user ID: FIXED (sprint 2)
- #7 PHQ-9 migration: FIXED (sprint 2)
- #8 Date parsing 400: FIXED
- #9 Logout/revocation: FIXED (sprint 2)
- #10 DI/Provider: FIXED (sprint 2)
- #11–#17 Sprint 3 features: all FIXED and closed
- #18 Patient session scheduling: FIXED and closed

## Pending
- End-to-end testing on device once APK is available
- Set FIREBASE_CREDENTIALS_JSON env var on Railway for FCM to work in production
