# Backend Agent - API Specs

## Cloud Functions

### `calculateAssessmentScore`

- **Trigger**: Firestore document write in `assessments/{id}`.
- **Goal**: Read raw answers, apply JSON scoring rules, update `total_score` and `severity`.

### `generateSessionSummary`

- **Trigger**: HTTPS OnCall.
- **Goal**: Send session text to AI Safety Agent prompt, return draft for review.

### `createCarePlan`

- **Trigger**: HTTPS OnCall.
- **Goal**: Generate 3-phase plan based on patient clinical profile and latest assessments.

### `sendNotification`

- **Trigger**: Pub/Sub (Reminders) or Firestore trigger (Notes/Risk).
- **Goal**: Dispatch FCM push to therapist or patient.
