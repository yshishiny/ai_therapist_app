import json as _json
import uuid
from datetime import datetime, timezone
from typing import Any


class CarePlanRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def patient_exists(self, patient_id: str, org_id: str) -> bool:
        """Check if a patient exists in the organisation."""
        if self.db is None:
            return False
        result = await self.db.fetchval(
            "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return result is not None

    async def list_careplans(self, patient_id: str, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        exists = await self.db.fetchval(
            "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        if not exists:
            return []
        rows = await self.db.fetch(
            "SELECT id, patient_id, status, main_track, goals, created_at FROM care_plans WHERE patient_id=$1 ORDER BY created_at DESC",
            uuid.UUID(patient_id),
        )
        return [dict(r) for r in rows]

    async def create_careplan(self, patient_id: str, payload: dict, created_by: str, org_id: str) -> dict:
        if self.db is None:
            return payload
        exists = await self.db.fetchval(
            "SELECT 1 FROM patients WHERE id=$1 AND org_id=$2",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        if not exists:
            return {}
        new_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        goals_json = _json.dumps(payload.get('goals')) if payload.get('goals') else None
        await self.db.execute(
            """INSERT INTO care_plans (id, patient_id, created_by, status, main_track, goals, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$7)""",
            new_id, uuid.UUID(patient_id), created_by, payload.get('status', 'DRAFT'), payload.get('main_track'), goals_json, now,
        )
        return {'id': str(new_id), 'patient_id': patient_id, 'status': payload.get('status', 'DRAFT'), 'main_track': payload.get('main_track'), 'goals': payload.get('goals'), 'created_at': now}

    async def get_active_careplan(self, patient_id: str) -> dict | None:
        """Get the active care plan for a patient, or the most recent one if none is active."""
        if self.db is None:
            return None

        # Try to get active plan first
        plan = await self.db.fetchrow(
            "SELECT * FROM care_plans WHERE patient_id=$1 AND status='ACTIVE' ORDER BY created_at DESC LIMIT 1",
            uuid.UUID(patient_id),
        )

        # Fall back to most recent plan
        if plan is None:
            plan = await self.db.fetchrow(
                "SELECT * FROM care_plans WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 1",
                uuid.UUID(patient_id),
            )

        if plan is None:
            return None

        # Get phases for this plan
        phases = await self.db.fetch(
            "SELECT * FROM care_plan_phases WHERE careplan_id=$1 ORDER BY phase_index ASC",
            plan["id"],
        )

        # Build response
        plan_data = dict(plan)
        goals = plan_data.get("goals")
        plan_data["goals"] = _json.loads(goals) if isinstance(goals, str) else goals

        phase_items = []
        for phase in phases:
            item = dict(phase)
            for key in ("methods", "homework_templates", "measures_to_track"):
                value = item.get(key)
                item[key] = _json.loads(value) if isinstance(value, str) else value
            phase_items.append(item)

        plan_data["phases"] = phase_items
        return plan_data
