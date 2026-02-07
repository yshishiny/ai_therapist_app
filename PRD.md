# AI Therapist — Full PRD

_Priority: P4 — Execute after Mon 9 Feb 2026 audit deadline_  
_Stack: Flutter + Firebase (recommended)_

---

## 1. Users & Roles

| Role       | Access                                           |
| ---------- | ------------------------------------------------ |
| Therapist  | Full access to all patient data, plans, AI tools |
| Assistant  | Scheduling only, no clinical notes               |
| Supervisor | Read-only anonymized cases (optional)            |
| Patient    | Forms, homework, reminders (future)              |

---

## 2. Core Modules

### A. Patient Management

- Profile: demographics, contact, emergency contact
- Clinical intake: presenting problem, history, medications, prior therapy
- Risk flags: self-harm, abuse, psychosis, substance use
- Goals, strengths, triggers

### B. Scheduling

- Calendar with recurring sessions
- Cancellation/no-show tracking
- Automated reminders (push/email)

### C. Assessments

| Test   | License  | Delivery              |
| ------ | -------- | --------------------- |
| PHQ-9  | FREE     | In-app or Google Form |
| GAD-7  | FREE     | In-app or Google Form |
| PSS-10 | FREE     | In-app                |
| WHO-5  | FREE     | In-app                |
| PCL-5  | Verify   | In-app                |
| BDI-II | LICENSED | In-app (if licensed)  |

### D. Dashboard

- Patient status cards (active/paused/discharged)
- Symptom trends (PHQ-9, GAD-7 over time)
- Engagement: homework completion, attendance
- Risk alerts

### E. AI Decision-Support

- Session note summarizer
- Theme extractor (beliefs, distortions, triggers)
- Risk prompting (flag + confirm)
- Homework recommender
- **Always: therapist reviews and approves**

### F. Phased Healing Plan Generator

- Phase 1: Stabilization + alliance
- Phase 2: Core work (CBT/DBT/ACT/Trauma/IFS/Art therapy)
- Phase 3: Consolidation + relapse prevention

---

## 3. Data Schema

```sql
-- Core Entities
Patient(id, therapist_id, full_name, dob, gender, phone, email,
        consent_ai_analysis, status, created_at)

ClinicalProfile(id, patient_id, presenting_problem, history, medications,
                prior_therapy, trauma_history, goals, risk_level,
                formulation_summary, created_at)

RiskFlag(id, patient_id, type, severity, active, notes, created_at)

Appointment(id, patient_id, therapist_id, start_time, end_time,
            location, status, reminder_sent_at, created_at)

SessionNote(id, appointment_id, patient_id, template, subjective,
            objective, assessment, plan, free_text,
            ai_draft_summary, ai_suggestions, created_at)

AssessmentTemplate(id, name, type, license_status, scoring_rules,
                   interpretation_rules, delivery, google_form_url)

AssessmentInstance(id, patient_id, template_id, taken_at, context,
                   raw_answers, score_total, severity_band, flagged)

CarePlan(id, patient_id, status, main_track, goals, created_at)

CarePlanPhase(id, careplan_id, phase_index, title, objectives,
              methods, homework_templates, measures_to_track)

HomeworkTask(id, patient_id, careplan_phase_id, title, instructions,
             due_date, status, patient_feedback)

AuditLog(id, actor_user_id, action, entity_type, entity_id, timestamp)
```

---

## 4. AI Prompts

### 4.1 Session Summary

```
SYSTEM: You are a clinical documentation assistant. You do NOT diagnose.
You produce drafts for therapist review. Flag risk indicators and propose
assessment questions; do not take actions.

OUTPUT: JSON with session_summary, key_themes, risk_review,
next_session_focus, homework_options, missing_information, disclaimer
```

### 4.2 Phased Plan Builder

```
SYSTEM: You produce phased treatment plans aligned to patient goals.
Combine CBT/DBT/ACT/Trauma/IFS/Art therapy when appropriate.
Provide options and therapist decision points.

OUTPUT: JSON with phase_plan (3 phases), methods per track,
homework_library, therapist_decision_points, disclaimer
```

---

## 5. Antigravity Agent Manager Setup

### Workspace: AI Therapist

| Agent            | Mission                                     |
| ---------------- | ------------------------------------------- |
| Product/Clinical | User stories, templates, safety guardrails  |
| UX/UI            | Mobile wireframes, patient flow, dashboard  |
| Data/Backend     | Schema, API, audit logging, permissions     |
| Assessments      | Test inventory, Forms + scoring, validation |
| AI Safety        | Prompts, risk escalation, red-team tests    |
| Notifications    | Reminders, events digest, WhatsApp forward  |
| QA/Security      | Threat model, test plan, release gates      |

---

## 6. MVP Phases

| Phase | Scope                                                        | Timeline   |
| ----- | ------------------------------------------------------------ | ---------- |
| MVP-1 | Patient folders, scheduler, PHQ-9/GAD-7, notes + AI summary  | 2-4 weeks  |
| MVP-2 | Phased plan generator, homework tracking, outcomes dashboard | +2-3 weeks |
| MVP-3 | Patient portal, billing, supervisor mode                     | +3-4 weeks |

---

## 7. Security Requirements

- Encryption at rest + in transit
- Role-based access control
- Consent toggle per patient for AI analysis
- Audit log for all access/edits
- Backup + retention policy
- Patient data export on request
