# AI Therapist — Requirements Spec

_Client: Wife (Psychological Therapist)_  
_Priority: P4 — Start after Mon 9 Feb deadline_

---

## Core Modules

### 1. Patient Management

- Individual patient folder/file
- Clinical profiling (demographics, history, presenting issues)
- Session scheduling + calendar sync

### 2. Assessment Engine

**Google Forms integration** for instant scoring during session:

| Test             | Purpose                       |
| ---------------- | ----------------------------- |
| PHQ-9            | Depression screening          |
| GAD-7            | Anxiety screening             |
| PCL-5            | PTSD/Trauma                   |
| BDI-II           | Beck Depression Inventory     |
| Big Five / OCEAN | Personality profiling         |
| ACE              | Adverse Childhood Experiences |
| DES-II           | Dissociation screening        |

→ Auto-analyze + display results instantly in dashboard

### 3. Treatment Planning AI

Generate phased healing plan based on profile:

**Therapeutic Modalities:**

- CBT (Cognitive Behavioral Therapy)
- DBT (Dialectical Behavior Therapy)
- ACT (Acceptance & Commitment Therapy)
- Trauma-focused: EMDR, somatic, trauma analysis
- IFS (Internal Family Systems)
- Art Therapy techniques

### 4. Dashboard

- Patient status at a glance
- Progress tracking (PHQ-9 over time, etc.)
- Session notes with AI-assisted analysis

### 5. Session Notes Analysis

- Therapist writes notes → AI extracts:
  - Key themes
  - Progress indicators
  - Risk flags
  - Suggested interventions

### 6. WhatsApp Integration

- Connect to therapy groups
- Daily summary of updates
- Alert on events/courses/trainings

### 7. Mobile App

- Patient self-assessments
- Appointment reminders
- Secure messaging

---

## Tech Stack (TBD)

- Backend: Python/FastAPI or Node.js
- DB: PostgreSQL + vector store for notes
- Forms: Google Forms API or custom
- LLM: Local (LM Studio) or cloud
- Mobile: React Native or Flutter
- WhatsApp: Twilio or direct API
