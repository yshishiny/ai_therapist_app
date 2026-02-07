# AI Therapist — Flutter App Structure

```
ai_therapist/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── routes.dart
│   │   └── theme.dart
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── auth_service.dart
│   │   ├── patients/
│   │   │   ├── patient_list_screen.dart
│   │   │   ├── patient_detail_screen.dart
│   │   │   ├── patient_model.dart
│   │   │   └── patient_repository.dart
│   │   ├── sessions/
│   │   │   ├── session_note_screen.dart
│   │   │   ├── session_model.dart
│   │   │   └── session_repository.dart
│   │   ├── assessments/
│   │   │   ├── test_screen.dart
│   │   │   ├── scoring_service.dart
│   │   │   └── assessment_model.dart
│   │   ├── careplan/
│   │   │   ├── plan_builder_screen.dart
│   │   │   ├── careplan_model.dart
│   │   │   └── ai_plan_service.dart
│   │   ├── dashboard/
│   │   │   ├── dashboard_screen.dart
│   │   │   └── dashboard_widgets.dart
│   │   └── calendar/
│   │       ├── calendar_screen.dart
│   │       └── appointment_model.dart
│   ├── core/
│   │   ├── firebase_service.dart
│   │   ├── ai_service.dart
│   │   └── notification_service.dart
│   └── shared/
│       ├── widgets/
│       └── utils/
├── functions/
│   ├── index.js
│   ├── scoring.js
│   ├── ai_summary.js
│   └── notifications.js
├── firestore.rules
├── pubspec.yaml
└── README.md
```
