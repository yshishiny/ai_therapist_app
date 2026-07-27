import json as _json
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.src.services.assessment_scoring import ScoringError, score_assessment


def _decode(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return _json.loads(value)
        except _json.JSONDecodeError:
            return value
    return value


class AssessmentRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_assessments(self, patient_id: str, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """
            SELECT ai.id, ai.patient_id, ai.template_id AS assessment_id,
                   ai.score_total AS raw_score, ai.subscale_scores,
                   ai.severity_band AS severity, ai.interpretation_text AS interpretation,
                   ai.flagged, ai.taken_at AS created_at
            FROM assessment_instances ai
            JOIN patients p ON p.id = ai.patient_id
            WHERE ai.patient_id = $1 AND p.org_id = $2
            ORDER BY ai.taken_at DESC
            """,
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        results = []
        for row in rows:
            item = dict(row)
            item["id"] = str(item["id"])
            item["patient_id"] = str(item["patient_id"])
            item["subscale_scores"] = _decode(item.get("subscale_scores"))
            item["risk_flags"] = []
            results.append(item)
        return results

    async def _resolve_instrument(self, template_id: str, org_id: str) -> dict[str, Any] | None:
        managed = await self.db.fetchrow(
            """
            SELECT av.scoring_rules, av.interpretation_rules, av.risk_rules
            FROM assessment_catalog ac
            JOIN assessment_versions av ON av.id = ac.current_published_version_id
            WHERE ac.org_id = $1 AND ac.template_key = $2 AND ac.is_active = TRUE
            """,
            uuid.UUID(org_id),
            template_id,
        )
        if managed:
            data = dict(managed)
            return {
                "scoring_rules": _decode(data.get("scoring_rules")),
                "interpretation_rules": _decode(data.get("interpretation_rules")),
                "risk_rules": _decode(data.get("risk_rules")),
            }
        legacy = await self.db.fetchrow(
            "SELECT scoring_rules, interpretation_rules FROM assessment_templates WHERE id = $1",
            template_id,
        )
        if legacy:
            data = dict(legacy)
            return {
                "scoring_rules": _decode(data.get("scoring_rules")),
                "interpretation_rules": _decode(data.get("interpretation_rules")),
                "risk_rules": None,
            }
        return None

    async def submit_assessment(self, patient_id: str, payload: dict, submitted_by: str, org_id: str) -> dict:
        if self.db is None:
            return payload
        exists = await self.db.fetchval(
            "SELECT 1 FROM patients WHERE id = $1 AND org_id = $2",
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        if not exists:
            return {}

        template_id = payload["template_id"]
        instrument = await self._resolve_instrument(template_id, org_id)
        if not instrument:
            return {}

        try:
            result = score_assessment(
                scoring_rules=instrument["scoring_rules"],
                interpretation_rules=instrument["interpretation_rules"],
                risk_rules=instrument["risk_rules"],
                answers=payload["answers"],
            )
        except ScoringError as exc:
            raise ValueError(str(exc)) from exc

        new_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        total_score = result["total_score"]
        score_total_int = round(total_score) if total_score is not None else None

        session_id = payload.get("session_id")
        await self.db.execute(
            """
            INSERT INTO assessment_instances
                (id, patient_id, template_id, taken_at, raw_answers,
                 score_total, subscale_scores, severity_band,
                 interpretation_text, flagged, org_id, session_id)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, $10, $11, $12)
            """,
            new_id,
            uuid.UUID(patient_id),
            template_id,
            now,
            _json.dumps(payload["answers"]),
            score_total_int,
            _json.dumps(result["subscale_scores"]) if result["subscale_scores"] else None,
            result["interpretation_text"],
            result["interpretation_text"],
            result["flagged"],
            uuid.UUID(org_id),
            uuid.UUID(session_id) if session_id else None,
        )

        for flag in result["risk_flags"]:
            await self.db.execute(
                """
                INSERT INTO risk_flags (id, patient_id, flag_type, severity, active, notes, created_at)
                VALUES ($1, $2, $3, $4, TRUE, $5, $6)
                """,
                uuid.uuid4(),
                uuid.UUID(patient_id),
                flag["flag"] or "UNSPECIFIED",
                flag["risk_level"],
                flag["message"],
                now,
            )

        return {
            "id": str(new_id),
            "patient_id": patient_id,
            "assessment_id": template_id,
            "raw_score": score_total_int,
            "subscale_scores": result["subscale_scores"] or None,
            "severity": result["interpretation_text"],
            "interpretation": result["interpretation_text"],
            "flagged": result["flagged"],
            "risk_flags": result["risk_flags"],
            "created_at": now,
        }
