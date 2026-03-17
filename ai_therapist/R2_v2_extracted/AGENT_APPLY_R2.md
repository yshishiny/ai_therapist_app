# R2 — Agent Apply Instructions
**For: Antigravity Agent Manager**
**Release: 2.0**
**Action: Add 8 new files. Update 2 existing files. Run 1 command.**

---

## pubspec.yaml additions (add under dependencies:)

```yaml
  flutter_local_notifications: ^17.2.0
  timezone: ^0.9.4
```

No other dependency changes needed. `flutter_secure_storage` and
`provider` were already added in R1 security fix.

---

## Step 1 — Add 8 new files

### File 1 of 8
**Destination:** `lib/features/patients/patient_folder_model.dart`
**Source:** `r2b/lib/features/patients/patient_folder_model.dart`
**What it is:** Complete clinical record model (30+ fields). Replaces the thin R1
Patient class. Used by PatientFolderScreen, DashboardProvider, and AuditLog.

### File 2 of 8
**Destination:** `lib/features/patients/patient_folder_screen.dart`
**Source:** `r2b/lib/features/patients/patient_folder_screen.dart`
**What it is:** 5-tab patient folder UI: Profile, Timeline, Assessments,
Homework, Settings. Replaces PatientDetailScreen for full clinical use.

### File 3 of 8
**Destination:** `lib/core/ai_service_r2.dart`
**Source:** `r2b/lib/core/ai_service_r2.dart`
**What it is:** Extended AI service adding extractThemes, suggestNextFocus,
proposeHomework, flagRiskLanguage, generateHealingPlan, suggestNextAssessment.

### File 4 of 8
**Destination:** `lib/features/sessions/session_ai_review_screen.dart`
**Source:** `r2b/lib/features/sessions/session_ai_review_screen.dart`
**What it is:** Therapist approval gate. All AI output must be reviewed and
approved before saving. Risk flags displayed first. Per-section approve/reject.

### File 5 of 8
**Destination:** `lib/features/homework/homework_service.dart`
**Source:** `r2b/lib/features/homework/homework_service.dart`
**What it is:** Homework model, assignment, feedback tracking, and adherence
summary. Encrypted in SecurePhiStorage.

### File 6 of 8
**Destination:** `lib/features/dashboard/dashboard_provider.dart`
**Source:** `r2b/lib/features/dashboard/dashboard_provider.dart`
**What it is:** ChangeNotifier provider with real data aggregation, EarlyWarning
engine, and PatientSummaryRow list. Replaces hardcoded mock stats.

### File 7 of 8
**Destination:** `lib/features/dashboard/dashboard_screen_r2.dart`
**Source:** `r2b/lib/features/dashboard/dashboard_screen_r2.dart`
**What it is:** R2 dashboard screen consuming DashboardProvider. Real stat cards,
urgent warning banner, "Needs attention" patient list, skeleton loading.

### File 8 of 8
**Destination:** `lib/features/mindfulness/mindfulness_library_screen.dart`
**Source:** `r2b/lib/features/mindfulness/mindfulness_library_screen.dart`
**What it is:** Full mindfulness library with 7 techniques (MBSR, MBCT, DBT,
ACT, Compassion, Somatic). Short + full scripts, homework version, cautions,
safer alternatives, and a distress tracker (before/after 1–10 rating).

### File 9 of 9
**Destination:** `lib/features/calendar/scheduling_service.dart`
**Source:** `r2b/lib/features/calendar/scheduling_service.dart`
**What it is:** Full appointment CRUD with recurrence expansion, attendance
tracking, availability blocks, and a stub-ready NotificationService
(wired, but flutter_local_notifications body is commented out until
the package is added and tested on device).

---

## Step 2 — Replace 2 existing files

### Replace 1 of 2
**Destination:** `lib/main.dart`
**Source:** `r2b/lib/main.dart`
**Change:** Adds DashboardProvider to MultiProvider, calls
NotificationService.initialize() and Phq9Service.migrateFromSharedPreferences()
on startup. Switches home to DashboardScreen from dashboard_screen_r2.dart.

### Replace 2 of 2
**Destination:** `lib/features/dashboard/dashboard_screen.dart`
**Action:** Delete the DashboardContent class from this file
(lines containing class DashboardContent and its build method).
The DashboardScreen wrapper class (NavigationBar) stays — it now
imports and uses _DashboardHome from dashboard_screen_r2.dart.

**Simpler alternative:** Replace the entire file with:
```dart
export 'dashboard_screen_r2.dart';
```

---

## Step 3 — Run deprecation fix

```bash
dart fix --apply
flutter pub get
flutter analyze
```

Expected: 0 errors. Deprecation warnings resolved automatically.

---

## Step 4 — Verify

```bash
flutter run --dart-define=AI_API_URL=http://localhost:5051/chat
```

Expected behavior:
- Dashboard loads with real provider (skeleton → data)
- Tapping a patient opens the 5-tab PatientFolderScreen
- Assessments tab shows sparkline trend charts
- Homework tab shows adherence summary
- Resources tab includes Mindfulness library with technique detail screens
- Session notes screen "Review with AI" opens SessionAiReviewScreen
- All AI sections require explicit approval before saving

---

## DO NOT change
- `lib/features/assessments/` — unchanged from R1 + PHQ-9 session
- `lib/features/auth/` — unchanged
- `lib/core/secure_phi_storage.dart` — unchanged from security fix
- `lib/core/api_client.dart` — unchanged from security fix
- `lib/features/sessions/session_note_screen.dart` — unchanged from R1 fix
- `lib/app/theme.dart` — unchanged

---

## R2 feature completion status after this patch

| Feature                    | Status after R2       |
|----------------------------|-----------------------|
| Patient folder             | Complete              |
| Scheduling + reminders     | Service complete; UI pending |
| Assessments + trends       | Complete (sparklines) |
| Dashboard + early warnings | Complete              |
| Session notes + AI review  | Complete              |
| Phased healing plan        | Service ready; UI pending |
| Mindfulness library        | Complete              |
| Homework tracking          | Service complete; assign UI pending |
| Events / training digest   | Not yet built         |
| Security                   | Complete (R1)         |

Remaining R2 work:
1. SchedulerScreen rebuild with AppointmentService CRUD
2. HealingPlanGeneratorScreen (UI for generateHealingPlan)
3. HomeworkAssignmentScreen (assign from session review)
4. EventsInboxScreen (training digest)
