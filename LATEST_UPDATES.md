# AI Therapist — Latest Updates

> **Last updated:** 2026-03-21 (Sprint 3 complete)
> **Branch:** `roadmap`
> **Author:** Yasser Elshishiny

---

## Session Summary — 2026-03-21

Two major workstreams completed in this session:
1. **PDF Export** — AI clinical reports can now be downloaded as styled A4 PDFs
2. **Security Code Review + Fixes** — Full audit of backend and Flutter codebase; all critical and high findings patched

---

## 1. PDF Export Feature

### What was built
The "Export PDF" button in the AI Clinical Report tab was previously a no-op (`onPressed: () {}`). It is now fully functional.

### Files changed
| File | Change |
|---|---|
| `ai_therapist/pubspec.yaml` | Added `pdf: ^3.10.8` and `printing: ^5.12.0` |
| `ai_therapist/lib/features/patients/patient_report_tab.dart` | Added `_exportPdf()` method and wired button |

### How it works
1. Clinician generates a report (AI markdown synthesis)
2. Taps **Export PDF**
3. `_exportPdf()` parses the markdown line-by-line (`#`, `##`, `---`, bullets, numbered lists, italic) and renders each element into a styled A4 PDF using the `pdf` package
4. `Printing.sharePdf()` opens the native share/save dialog:
   - Android: share sheet or save to Downloads
   - iOS: share sheet

---

## 2. Security Code Review — Full Findings

A comprehensive code review was performed across `backend/app.py` and all Dart source files. 15 findings across 4 severity levels.

### Critical (🔴) — Fixed this session

#### Finding 1: IDOR — Homework & Assessment Endpoints Missing Org Scope
- **GitHub Issue:** [#1](https://github.com/yshishiny/ai_therapist_app/issues/1)
- **Files:** `backend/app.py`
- **Problem:** `GET /patients/{id}/homework`, `POST /patients/{id}/homework`, `POST /homework/{id}/feedback`, and `GET /patients/{id}/assessments` filtered only by `patient_id` — no `org_id` check. A clinician in Org A could read or write data for patients in Org B.
- **Fix:** Added `JOIN patients p ON p.id = ht.patient_id WHERE ... AND p.org_id = $N` to all four endpoints. `assign_homework` also gets a pre-flight patient ownership check.

#### Finding 2: PHI Stored in Plaintext SharedPreferences
- **GitHub Issue:** [#2](https://github.com/yshishiny/ai_therapist_app/issues/2)
- **Files:** `ai_therapist/lib/features/assessments/assessment_service.dart`
- **Problem:** `AssessmentService.saveResult()` wrote patient assessment answers, severity scores, and patient IDs to unencrypted Android SharedPreferences / iOS NSUserDefaults. HIPAA violation.
- **Fix:** Removed `SharedPreferences` dependency entirely. All read/write/clear operations now use `SecurePhiStorage` (AES-256 via Android Keystore / iOS Keychain), consistent with `Phq9Service`.

---

### High (🟡) — Fixed this session

#### Finding 3: No Global Exception Handler — Raw Tracebacks Leaked to Clients
- **GitHub Issue:** [#3](https://github.com/yshishiny/ai_therapist_app/issues/3)
- **Files:** `backend/app.py`
- **Problem:** Unhandled Python exceptions returned full stack traces (database schema, file paths, internal logic) to API clients.
- **Fix:** Added `@app.exception_handler(Exception)` — logs full traceback server-side (structured JSON) and returns only `{"detail": "Internal server error.", "correlation_id": "..."}` to the client.

#### Finding 4: No Pagination — Full Tables Loaded into Memory
- **GitHub Issue:** [#4](https://github.com/yshishiny/ai_therapist_app/issues/4)
- **Files:** `backend/app.py`
- **Problem:** `GET /patients` and `GET /patients/{id}/assessments` had no `LIMIT` clause — entire tables returned. Fatal for clinics with large patient volumes.
- **Fix:**
  - `/patients`: `limit=50, offset=0` query params → `LIMIT $2 OFFSET $3`
  - `/patients/{id}/assessments`: `limit=100, offset=0` → `LIMIT $3 OFFSET $4`

#### Finding 5: `print()` Leaks Stack Traces to Device Logs
- **GitHub Issue:** [#5](https://github.com/yshishiny/ai_therapist_app/issues/5)
- **Files:** `ai_therapist/lib/features/assessments/assessment_service.dart`
- **Problem:** `print('Assessment backend sync failed: $e')` wrote exception details to Android logcat / Xcode console in release builds.
- **Fix:** Replaced with `debugPrint()` — compiled out in release mode.

#### Finding 6: Date Parsing Throws 500 Instead of 400
- **GitHub Issue:** [#8](https://github.com/yshishiny/ai_therapist_app/issues/8)
- **Files:** `backend/app.py` — `assign_homework`
- **Problem:** `datetime.strptime(body.due_date, "%Y-%m-%d")` had no try/except — invalid date string caused unhandled `ValueError` → 500.
- **Fix:** Wrapped in try/except → `HTTPException(status_code=400, detail="due_date must be YYYY-MM-DD.")`.

---

### Railway Logging Upgrade

#### Correlation-ID Middleware Added
- **Files:** `backend/app.py`
- **What it does:**
  - Every incoming request is stamped with a `X-Correlation-ID` UUID (taken from header if present, generated if not)
  - Logs `method + path` on request start and `status_code` on finish, both including the correlation ID
  - The correlation ID is echoed back in the response header so client-side errors can be matched to Railway log lines
- **Why:** Enables end-to-end request tracing in Railway logs without a separate APM tool

```
# Example Railway log output (JSON, one line per event):
{"asctime":"2026-03-21T10:00:00Z","levelname":"INFO","message":"Request started","correlation_id":"abc-123","method":"GET","path":"/patients"}
{"asctime":"2026-03-21T10:00:00Z","levelname":"INFO","message":"Request finished","correlation_id":"abc-123","status_code":200}
```

---

### Open Issues — Next Sprint

| Issue | Severity | Finding |
|---|---|---|
| [#6](https://github.com/yshishiny/ai_therapist_app/issues/6) | Medium | Rate limiter keyed on IP — shared clinic networks exhausted for all users |
| [#7](https://github.com/yshishiny/ai_therapist_app/issues/7) | Medium | PHQ-9 migration sets "migrated" flag even on failure — history silently lost |
| [#9](https://github.com/yshishiny/ai_therapist_app/issues/9) | Medium | No logout endpoint — stolen device retains full API access |
| [#10](https://github.com/yshishiny/ai_therapist_app/issues/10) | Low | `ApiClient` singleton — no DI, hard to unit test |
| — | Low | No error boundaries in Flutter widget tree |
| — | Low | `DateTime.parse().toLocal()` without UTC normalization |
| — | Low | AI response JSON parsing too greedy / no timeout |

---

## 3. Full Project Status

### Completed Features
| Area | Status |
|---|---|
| JWT auth (access + refresh), bcrypt, role routing | ✅ Done |
| Clinician dashboard (stats, risk badges, patient list) | ✅ Done |
| Patient folder (5 tabs: Overview, Sessions, Assessments, Homework, Plan) | ✅ Done |
| Assessment engine (PHQ-9, GAD-7, PSS-10, WHO-5, PCL-5, PID-5, FEATS, PPAT, Metahealth, Reflexology) | ✅ Done |
| Longitudinal trend charts (fl_chart) | ✅ Done |
| AI clinical report generator (BPS markdown synthesis) | ✅ Done |
| PDF export of AI reports | ✅ Done (this session) |
| Patient portal (mood check-in, homework, AI chat, progress) | ✅ Done |
| Calendar & scheduling | ✅ Done |
| Mindfulness & reference libraries | ✅ Done |
| CI/CD (Railway + GitHub Actions + Fastlane) | ✅ Done |
| Security hardening (IDOR, PHI encryption, logging) | ✅ Done (this session) |

### Pending Roadmap Items
| Priority | Feature | Effort |
|---|---|---|
| 🔴 Critical | Run `migration_patient_portal.sql` on Railway production DB | 5 min |
| 🔴 Critical | End-to-end auth flow testing on device | 2 hrs |
| 🟡 High | Push notifications (FCM) | 4 hrs |
| 🟡 High | Interactive body map for somatic assessments | 6 hrs |
| 🟡 High | Art therapy image upload (S3/Firebase) | 4 hrs |
| 🟡 High | Homework assignment form (clinician side) | 3 hrs |
| 🟡 High | Session scheduling from patient side | 3 hrs |
| 🟢 Medium | Video/audio sessions (WebRTC/Agora) | 8 hrs |
| 🟢 Medium | Multi-language support (Arabic ↔ English, RTL) | 6 hrs |
| 🟢 Medium | Clinician-to-patient messaging | 4 hrs |

---

## 4. Architecture

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
                   │ HTTPS + JWT  (Bearer token)
┌──────────────────▼──────────────────────────────────────┐
│              FastAPI Backend (Railway)                    │
│  /auth/*  /patients/*  /me/*  /assessments/*             │
│  Rate Limiting │ CORS │ IDOR Protection │ JSON Logging   │
│  Correlation-ID Middleware │ Global Exception Handler    │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              PostgreSQL (Railway)                         │
│  organisations, clinicians, patient_users, patients,     │
│  sessions, homework_tasks, mood_logs, ai_conversations,  │
│  assessment_templates, assessment_instances, care_plans   │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Key Files Reference

| File | Purpose |
|---|---|
| `backend/app.py` | FastAPI backend — all routes, auth, middleware, logging |
| `backend/auth.py` | JWT creation, verification, role checking |
| `ai_therapist/lib/core/api_client.dart` | HTTP client with auto token refresh |
| `ai_therapist/lib/core/secure_phi_storage.dart` | AES-256 encrypted local storage for PHI |
| `ai_therapist/lib/features/patients/patient_report_tab.dart` | AI report viewer + PDF export |
| `ai_therapist/lib/features/assessments/assessment_service.dart` | Assessment scoring + encrypted persistence |
| `ai_therapist/lib/features/assessments/universal_assessment_screen.dart` | Universal assessment UI (Likert, body map, art therapy) |
| `migration_patient_portal.sql` | Production DB migration — must be run on Railway |
| `.github/workflows/build-apk.yml` | APK build CI |
| `.github/workflows/deploy_backend.yml` | Railway backend deploy CI |
| `ai_therapist/lib/features/patient_portal/patient_sessions_tab.dart` | Patient session list + request form (Sprint 3) |

---

## Sprint 3 Additions — Patient-Side Session Scheduling (Issue #18)

### What was built
Patients can now view their upcoming/past sessions and request new appointments directly from the mobile app.

### Files changed
| File | Change |
|---|---|
| `ai_therapist/lib/features/patient_portal/patient_sessions_tab.dart` | New — full session tab widget |
| `ai_therapist/lib/features/patient_portal/patient_app.dart` | Added Sessions as 5th bottom-nav tab |
| `backend/app.py` | Added `POST /me/sessions/request` endpoint |

### How it works
1. Patient opens the **Sessions** tab (calendar icon, 5th tab)
2. Loads `GET /me/sessions` — shows cards with session type, date, summary snippet
3. Taps **Request Session** FAB → bottom sheet with optional preferred date picker + notes field
4. Submits → `POST /me/sessions/request` inserts a `status='requested'` row in the `sessions` table
5. Therapist sees the request in the existing sessions dashboard

### GitHub
- Issue [#18](https://github.com/yshishiny/ai_therapist_app/issues/18) closed as completed
- Commit: `97e7890` on `roadmap` branch
