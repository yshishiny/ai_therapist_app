---
name: Code review findings
description: Full code review findings from 2026-03-21 with severity, status, and GitHub issue links
type: project
---

## Code Review — 2026-03-21

| # | Severity | Finding | File | Status | Issue |
|---|---|---|---|---|---|
| 1 | 🔴 Critical | IDOR: homework + assessment endpoints missing org_id scope | `backend/app.py:936-993, 1020` | ✅ Fixed | #1 |
| 2 | 🔴 Critical | PHI stored in plaintext SharedPreferences | `assessment_service.dart:171-174` | ✅ Fixed | #2 |
| 3 | 🔴 Critical | AI response parse failures stored as clinical data | `ai_service.dart:39-62` | Open | — |
| 4 | 🟡 High | No global exception handler — raw tracebacks leak | `backend/app.py` | ✅ Fixed | #3 |
| 5 | 🟡 High | No pagination on list endpoints | `backend/app.py:360, 1020` | ✅ Fixed | #4 |
| 6 | 🟡 High | print() leaks stack traces in production | `assessment_service.dart:181` | ✅ Fixed | #5 |
| 7 | 🟡 High | No logout/token revocation endpoint | `app.py`, `api_client.dart` | Open | #9 |
| 8 | 🟡 High | Date parsing throws 500 on invalid input | `app.py:965` | ✅ Fixed | #8 |
| 9 | 🔵 Medium | Rate limiter keyed on IP not user | `app.py:57` | Open | #6 |
| 10 | 🔵 Medium | PHQ-9 migration race condition + silent failure | `phq9_service.dart:288-314` | Open | #7 |
| 11 | 🔵 Medium | Role() constructor throws 500 on bad DB value | `app.py:305` | Open | — |
| 12 | 🔵 Medium | AI report: no timeout or max_tokens cap | `app.py:1117` | Open | — |
| 13 | 🔵 Low | ApiClient singleton — no DI, untestable | `api_client.dart:30` | Open | #10 |
| 14 | 🔵 Low | No error boundaries in Flutter widgets | Multiple screens | Open | — |
| 15 | 🔵 Low | DateTime parsing without UTC normalization | `dashboard_provider.dart:137` | Open | — |
