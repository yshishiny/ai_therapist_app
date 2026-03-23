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
