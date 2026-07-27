import uuid
from datetime import datetime, timezone
from typing import Any


class DashboardRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def get_summary(self, org_id: str) -> dict:
        if self.db is None:
            return {
                'active_cases': 0,
                'new_this_month': 0,
                'risk_alerts': 0,
                'high_priority': 0,
                'assessments_completed': 0,
                'sessions_today': 0,
                'sessions_remaining': 0,
            }
        org = uuid.UUID(org_id)
        now = datetime.now(timezone.utc)
        active_cases = await self.db.fetchval("SELECT COUNT(*) FROM patients WHERE org_id=$1 AND status='Active'", org) or 0
        new_this_month = await self.db.fetchval("SELECT COUNT(*) FROM patients WHERE org_id=$1 AND created_at >= date_trunc('month', $2::timestamptz)", org, now) or 0
        high_priority = await self.db.fetchval("SELECT COUNT(*) FROM patients WHERE org_id=$1 AND risk IN ('High','Crisis')", org) or 0
        assessments_completed = await self.db.fetchval("SELECT COUNT(*) FROM assessment_results ar JOIN patients p ON p.id = ar.patient_id WHERE p.org_id = $1", org) or 0
        sessions_today = await self.db.fetchval("SELECT COUNT(*) FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE p.org_id = $1 AND a.start_time::date = $2::date AND a.status = 'SCHEDULED'", org, now) or 0
        return {
            'active_cases': active_cases,
            'new_this_month': new_this_month,
            'risk_alerts': high_priority,
            'high_priority': high_priority,
            'assessments_completed': assessments_completed,
            'sessions_today': sessions_today,
            'sessions_remaining': sessions_today,
        }

    async def get_clinician_summary(self, org_id: str, therapist_id: str) -> dict:
        if self.db is None:
            return {
                'patients_count': 0,
                'sessions_today_count': 0,
                'notes_due_count': 0,
                'today_schedule': [],
                'needs_review': [],
                'notes_due': [],
            }
        org = uuid.UUID(org_id)
        now = datetime.now(timezone.utc)

        patients_count = await self.db.fetchval(
            "SELECT COUNT(*) FROM patients WHERE org_id=$1 AND therapist_id=$2",
            org, therapist_id,
        ) or 0

        schedule_rows = await self.db.fetch(
            """SELECT a.id, a.patient_id, p.name AS patient_name, p.risk AS patient_risk,
                      a.start_time, a.end_time, a.location, a.status
               FROM appointments a
               JOIN patients p ON p.id = a.patient_id
               WHERE p.org_id = $1 AND a.therapist_id = $2
                 AND a.start_time::date = $3::date
               ORDER BY a.start_time ASC""",
            org, therapist_id, now,
        )

        review_rows = await self.db.fetch(
            """SELECT ai.patient_id, p.name AS patient_name, ai.interpretation_text, ai.taken_at,
                      COALESCE(ac.name, ai.template_id) AS instrument_name
               FROM assessment_instances ai
               JOIN patients p ON p.id = ai.patient_id
               LEFT JOIN assessment_catalog ac
                 ON ac.org_id = ai.org_id AND ac.template_key = ai.template_id
               WHERE p.org_id = $1 AND p.therapist_id = $2 AND ai.flagged = TRUE
                 AND ai.taken_at >= $3::timestamptz - INTERVAL '14 days'
               ORDER BY ai.taken_at DESC
               LIMIT 5""",
            org, therapist_id, now,
        )

        notes_due_rows = await self.db.fetch(
            """SELECT sn.id AS note_id, sn.patient_id, p.name AS patient_name, sn.created_at
               FROM session_notes sn
               JOIN patients p ON p.id = sn.patient_id
               WHERE p.org_id = $1 AND p.therapist_id = $2 AND sn.therapist_approved = FALSE
               ORDER BY sn.created_at DESC
               LIMIT 5""",
            org, therapist_id,
        )
        notes_due_count = await self.db.fetchval(
            """SELECT COUNT(*) FROM session_notes sn
               JOIN patients p ON p.id = sn.patient_id
               WHERE p.org_id = $1 AND p.therapist_id = $2 AND sn.therapist_approved = FALSE""",
            org, therapist_id,
        ) or 0

        return {
            'patients_count': patients_count,
            'sessions_today_count': len(schedule_rows),
            'notes_due_count': notes_due_count,
            'today_schedule': [self._schedule_row(r) for r in schedule_rows],
            'needs_review': [self._review_row(r) for r in review_rows],
            'notes_due': [self._note_row(r) for r in notes_due_rows],
        }

    @staticmethod
    def _schedule_row(row: Any) -> dict:
        d = dict(row)
        d['id'] = str(d['id'])
        d['patient_id'] = str(d['patient_id'])
        return d

    @staticmethod
    def _review_row(row: Any) -> dict:
        d = dict(row)
        d['patient_id'] = str(d['patient_id'])
        return d

    @staticmethod
    def _note_row(row: Any) -> dict:
        d = dict(row)
        d['note_id'] = str(d['note_id'])
        d['patient_id'] = str(d['patient_id'])
        return d
