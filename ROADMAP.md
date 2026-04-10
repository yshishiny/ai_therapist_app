# AI Therapist — Product Roadmap

> **Last updated:** 2026-03-20
> **Branch:** `roadmap`

---

## ✅ Completed Features

### 🔐 Authentication & Security (Phase 1)
| Feature | Status | Files |
|---|---|---|
| JWT access + refresh token pairs | ✅ Done | `auth.py` |
| bcrypt password hashing | ✅ Done | `auth.py` |
| Role-based access (Admin/Clinician/Supervisor/Patient) | ✅ Done | `auth.py` |
| Patient login via `patient_users` table | ✅ Done | `app.py` |
| Flutter secure token storage (Keychain/Keystore) | ✅ Done | `api_client.dart`, `secure_phi_storage.dart` |
| Auto-refresh on 401 with silent retry | ✅ Done | `api_client.dart` |
| Role-aware routing (Patient → PatientApp, Clinician → Dashboard) | ✅ Done | `main.dart`, `auth_service.dart` |
| Rate limiting (SlowAPI 200 req/min) | ✅ Done | `app.py` |
| CORS + IDOR protection (org_id scoping) | ✅ Done | `app.py` |

### 📊 Clinician Dashboard (Phase 1-2)
| Feature | Status | Files |
|---|---|---|
| Dashboard with stats grid (active cases, risk alerts, sessions today) | ✅ Done | `dashboard_screen_r2.dart` |
| Needs-attention patient list with risk badges | ✅ Done | `dashboard_screen_r2.dart` |
| All-patients list with risk color coding | ✅ Done | `dashboard_screen_r2.dart` |
| Dashboard data provider (API-connected) | ✅ Done | `dashboard_provider.dart` |
| Admin dashboard | ✅ Done | `admin_dashboard_screen.dart` |

### 📁 Patient Folder / Detail (Phase 2)
| Feature | Status | Files |
|---|---|---|
| 5-tab patient folder (Overview, Sessions, Assessments, Homework, Plan) | ✅ Done | `patient_folder_screen.dart` |
| Session history with AI review integration | ✅ Done | `session_note_screen.dart`, `session_ai_review_screen.dart` |
| Homework tab (API-wired assign + feedback) | ✅ Done | `patient_folder_screen.dart`, `homework_service.dart` |
| Care plan viewer (phases, goals, methods) | ✅ Done | `careplan_screen.dart` |

### 🧪 Assessment Engine (Phase 3-4)
| Feature | Status | Files |
|---|---|---|
| Assessment templates in DB (PHQ-9, GAD-7, PSS-10, WHO-5, PCL-5, PID-5, FEATS, PPAT, Metahealth, Reflexology) | ✅ Done | `schema.sql` |
| `GET /assessments/templates`, `POST /patients/{id}/assessments`, `GET /patients/{id}/assessments` | ✅ Done | `app.py` |
| Universal Assessment Screen (Likert, Body Map, Art Therapy) | ✅ Done | `universal_assessment_screen.dart` |
| Patient Trends Tab (fl_chart longitudinal graphing) | ✅ Done | `patient_trends_tab.dart` |
| AI Clinical Report Generator (Markdown BPS synthesis) | ✅ Done | `patient_report_tab.dart` |
| AI Orchestrator endpoint (`POST /patients/{id}/report/generate`) | ✅ Done | `app.py` |

### 📅 Calendar & Scheduling (Phase 2)
| Feature | Status | Files |
|---|---|---|
| Scheduler screen | ✅ Done | `scheduler_screen.dart`, `scheduler_screen_r2.dart` |
| Calendar view | ✅ Done | `calendar_screen.dart` |
| Scheduling + calendar services | ✅ Done | `scheduling_service.dart`, `calendar_service.dart` |
| Appointment model | ✅ Done | `appointment_model.dart` |

### 🧘 Mindfulness & Resources (Phase 2)
| Feature | Status | Files |
|---|---|---|
| Mindfulness library (6 seeded techniques: MBSR, MBCT, DBT, ACT, Somatic, Compassion) | ✅ Done | `mindfulness_library_screen.dart`, `schema.sql` |
| Reference library (books, handouts, articles) | ✅ Done | `reference_library_screen.dart` |
| Resource CRUD API | ✅ Done | `app.py` |

### 📱 Patient Portal (Phase 5)
| Feature | Status | Files |
|---|---|---|
| Patient root app scaffold (4-tab bottom nav) | ✅ Done | `patient_app.dart` |
| Daily mood check-in (emoji picker + energy slider) | ✅ Done | `patient_home_tab.dart` |
| Wellness tools (animated breathing exercise) | ✅ Done | `patient_home_tab.dart` |
| Next session countdown card | ✅ Done | `patient_home_tab.dart` |
| Homework viewer + submit with star rating | ✅ Done | `patient_homework_tab.dart` |
| Progress charts (fl_chart mood sparkline + streak) | ✅ Done | `patient_progress_tab.dart` |
| AI Companion Chat (iMessage-style + typing indicator) | ✅ Done | `patient_chat_tab.dart` |
| Patient-scoped API routes (`/me/*`) | ✅ Done | `app.py` |
| Database migration (mood_logs, ai_conversations, sessions, patient_users) | ✅ Done | `migration_patient_portal.sql` |

### 🔧 CI / CD & DevOps (Phase 1)
| Feature | Status | Files |
|---|---|---|
| GitHub Actions — Docker build CI | ✅ Done | `deploy_backend.yml` |
| GitHub Actions — APK build | ✅ Done | `build-apk.yml` |
| Fastlane Play Store deployment | ✅ Done | `Fastfile`, `Gemfile` |
| Railway backend deployment | ✅ Done | `railway.toml`, `Dockerfile` |
| Develop branch for beta releases | ✅ Done | branch: `develop` |

---

## 🚧 In Progress / Remaining Work

### 🔴 Critical (Must-Have for Launch)

| # | Feature | Priority | Effort | Details |
|---|---|---|---|---|
| 1 | **Run migration on Railway DB** | 🔴 Critical | 5 min | Execute `migration_patient_portal.sql` against production Postgres |
| 2 | ~~**Generate real bcrypt hash for demo patient**~~ | ✅ Done | — | Seeded in migration with hash for `welcome123` |
| 3 | ~~**Wire AiService to a real LLM**~~ | ✅ Done | — | `ai_service.py` — dual Gemini/OpenAI provider. Set `GEMINI_API_KEY` env var. |
| 4 | **End-to-end auth flow testing** | 🔴 Critical | 2 hrs | Test clinician login, patient login, token refresh, and route gating on device |
| 5 | **PDF report export** | 🟡 High | 3 hrs | Convert AI markdown reports to downloadable PDF (use `pdf` package in Flutter) |

### 🟡 High Priority (Pre-Beta)

| # | Feature | Priority | Effort | Details |
|---|---|---|---|---|
| 6 | ~~**Patient registration / self-signup**~~ | ✅ Done | — | `POST /auth/register-patient` + `PatientRegisterScreen` + login link |
| 7 | **Push notifications** | 🟡 High | 4 hrs | Firebase Cloud Messaging for homework reminders, session reminders, mood log nudges |
| 8 | **Interactive body map (Somatic assessments)** | 🟡 High | 6 hrs | Replace placeholder with SVG touch-regions for Reflexology / Metahealth |
| 9 | **Art therapy image upload** | 🟡 High | 4 hrs | Camera/gallery picker → S3/Firebase Storage → FEATS scoring submission |
| 10 | **Homework assignment from clinician** | 🟡 High | 3 hrs | Clinician homework tab currently reads — needs a "New Task" form + API |
| 11 | **Session scheduling from patient side** | 🟡 High | 3 hrs | Patient requests available slots from clinician's calendar |

### 🟢 Medium Priority (Post-Beta)

| # | Feature | Priority | Effort | Details |
|---|---|---|---|---|
| 12 | **Video/audio session support** | 🟢 Medium | 8 hrs | WebRTC or Agora SDK integration for telehealth |
| 13 | **Multi-language support (Arabic ↔ English)** | 🟢 Medium | 6 hrs | `flutter_localizations` + RTL layout support |
| 14 | **Clinician-to-patient messaging** | 🟢 Medium | 4 hrs | Secure in-app messaging (not AI — real therapist messages) |
| 15 | **Patient onboarding wizard** | 🟢 Medium | 4 hrs | Guided setup: demographics, emergency contacts, consent, initial assessment |
| 16 | **Appointment reminders** | 🟢 Medium | 3 hrs | Push notifications + email reminders 24h and 1h before sessions |
| 17 | **Data export (HIPAA compliance)** | 🟢 Medium | 4 hrs | Patient data export to JSON/CSV for portability |
| 18 | **Audit trail viewer (admin)** | 🟢 Medium | 3 hrs | UI for the existing `audit_log` table |

### 🔵 Nice-to-Have (Future)

| # | Feature | Priority | Effort | Details |
|---|---|---|---|---|
| 19 | **Wearable integration** | 🔵 Future | 8 hrs | Apple Health / Google Fit — sleep, heart rate → mood correlation |
| 20 | **Group therapy sessions** | 🔵 Future | 6 hrs | Multi-patient session notes, group dynamics tracking |
| 21 | **Supervisor review workflow** | 🔵 Future | 4 hrs | Supervisor can review + co-sign clinician session notes |
| 22 | **Analytics dashboard** | 🔵 Future | 6 hrs | Practice-wide KPIs: caseload, outcomes, retention |
| 23 | **White-label theming** | 🔵 Future | 3 hrs | Per-organisation color schemes and logos |
| 24 | **Offline mode** | 🔵 Future | 8 hrs | Local SQLite cache + sync queue for no-connectivity areas |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter Mobile App                     │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │  LoginScreen  │    │  AuthWrapper (role routing)   │   │
│  └──────┬───────┘    └──────┬───────────────────────┘   │
│         │                    │                            │
│    ┌────▼────┐         ┌────▼────┐                      │
│    │ Patient │         │Clinician│                      │
│    │  App    │         │Dashboard│                      │
│    ├─────────┤         ├─────────┤                      │
│    │ Home    │         │ Home    │                      │
│    │ Homework│         │ Calendar│                      │
│    │ Progress│         │ Assess  │                      │
│    │ AI Chat │         │ Library │                      │
│    └─────────┘         └─────────┘                      │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS + JWT
┌──────────────────▼──────────────────────────────────────┐
│              FastAPI Backend (Railway)                    │
│  /auth/*  /patients/*  /me/*  /assessments/*             │
│  Rate Limiting │ CORS │ IDOR Protection                  │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              PostgreSQL (Railway)                         │
│  organisations, clinicians, patient_users, patients,     │
│  sessions, homework_tasks, mood_logs, ai_conversations,  │
│  assessment_templates, assessment_instances, care_plans   │
└─────────────────────────────────────────────────────────┘
```
