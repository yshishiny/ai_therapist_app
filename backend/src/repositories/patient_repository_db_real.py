import uuid
from datetime import date, datetime, timezone
from typing import Any


class PatientRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_patients(
        self, org_id: str, limit: int = 50, offset: int = 0, therapist_id: str | None = None
    ) -> list[dict]:
        if self.db is None:
            return []
        if therapist_id is not None:
            rows = await self.db.fetch(
                """
                SELECT id, name, status, risk, diagnosis, last_seen, therapist_id, dob, gender,
                       source, created_by, source_detail,
                       phone, email, emergency_contact_name, emergency_contact_phone,
                       consent_ai_analysis, wellbeing_status
                FROM patients
                WHERE org_id = $1 AND therapist_id = $2
                ORDER BY last_seen DESC NULLS LAST, created_at DESC
                LIMIT $3 OFFSET $4
                """,
                uuid.UUID(org_id),
                therapist_id,
                limit,
                offset,
            )
        else:
            rows = await self.db.fetch(
                """
                SELECT id, name, status, risk, diagnosis, last_seen, therapist_id, dob, gender,
                       source, created_by, source_detail,
                       phone, email, emergency_contact_name, emergency_contact_phone,
                       consent_ai_analysis, wellbeing_status
                FROM patients
                WHERE org_id = $1
                ORDER BY last_seen DESC NULLS LAST, created_at DESC
                LIMIT $2 OFFSET $3
                """,
                uuid.UUID(org_id),
                limit,
                offset,
            )
        return [self._row_to_dict(r) for r in rows]

    async def count_patients(self, org_id: str, therapist_id: str | None = None) -> int:
        """How many patients match the filters `list_patients` applies.

        Deliberately mirrors that method's WHERE clause and nothing else: the
        two must agree, or `total` will contradict `items` and paging will run
        off the end of the list (or stop short of it).
        """
        if self.db is None:
            return 0
        if therapist_id is not None:
            total = await self.db.fetchval(
                "SELECT COUNT(*) FROM patients WHERE org_id = $1 AND therapist_id = $2",
                uuid.UUID(org_id),
                therapist_id,
            )
        else:
            total = await self.db.fetchval(
                "SELECT COUNT(*) FROM patients WHERE org_id = $1",
                uuid.UUID(org_id),
            )
        return int(total or 0)

    async def get_patient(self, patient_id: str, org_id: str) -> dict | None:
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            """
            SELECT id, name, status, risk, diagnosis, last_seen, therapist_id, dob, gender,
                       source, created_by, source_detail,
                   phone, email, emergency_contact_name, emergency_contact_phone,
                   consent_ai_analysis, wellbeing_status
            FROM patients
            WHERE id = $1 AND org_id = $2
            """,
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return self._row_to_dict(row) if row else None

    async def update_patient(self, patient_id: str, org_id: str, updates: dict) -> dict | None:
        if self.db is None:
            return None
        if not updates:
            return await self.get_patient(patient_id=patient_id, org_id=org_id)
        set_clauses = []
        values: list[Any] = []
        for i, (col, val) in enumerate(updates.items(), start=1):
            set_clauses.append(f"{col} = ${i}")
            values.append(val)
        values.append(uuid.UUID(patient_id))
        values.append(uuid.UUID(org_id))
        row = await self.db.fetchrow(
            f"""
            UPDATE patients
            SET {', '.join(set_clauses)}, updated_at = NOW()
            WHERE id = ${len(values) - 1} AND org_id = ${len(values)}
            RETURNING id, name, status, risk, diagnosis, last_seen, therapist_id, dob, gender,
                      phone, email, emergency_contact_name, emergency_contact_phone,
                      consent_ai_analysis, wellbeing_status
            """,
            *values,
        )
        return self._row_to_dict(row) if row else None

    @staticmethod
    def _row_to_dict(row: Any) -> dict:
        data = dict(row)
        data["id"] = str(data["id"])
        data["diagnosis"] = data.get("diagnosis") or ""
        if data.get("created_by") is not None:
            data["created_by"] = str(data["created_by"])
        data["consent_ai_analysis"] = bool(data.get("consent_ai_analysis"))
        return data

    async def find_clinician_id_by_email(self, email: str, org_id: str) -> str | None:
        """Resolve a clinician's id from their email, scoped to the caller's org.

        Lives on the patient repository (rather than the clinician one) so the
        bulk-upload feature stays contained to the patient module.
        """
        if self.db is None:
            return None
        clinician_id = await self.db.fetchval(
            "SELECT id FROM clinicians WHERE lower(email) = lower($1) AND org_id = $2",
            email,
            uuid.UUID(org_id),
        )
        return str(clinician_id) if clinician_id is not None else None

    async def create_patient(
        self,
        payload: dict,
        org_id: str,
        therapist_id: str,
        source: str = 'MANUAL',
        created_by: str | None = None,
        source_detail: str | None = None,
    ) -> dict:
        """`source` says HOW the record arrived and `created_by` says WHO added
        it, so a seeded demo record can never again be mistaken for a real
        person on a clinician's caseload."""
        if self.db is None:
            return payload
        new_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        dob_str = payload.get('dob')
        dob = date.fromisoformat(dob_str) if dob_str else None
        await self.db.execute(
            """
            INSERT INTO patients
                (id, org_id, therapist_id, name, full_name, gender, dob,
                 diagnosis, risk, status, phone, email, created_at, updated_at,
                 source, created_by, source_detail)
            VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,$14,$15)
            """,
            new_id,
            uuid.UUID(org_id),
            therapist_id,
            payload['full_name'],
            payload.get('gender'),
            dob,
            payload.get('diagnosis', ''),
            payload.get('risk', 'Low'),
            payload.get('status', 'Active'),
            payload.get('phone'),
            payload.get('email'),
            now,
            source,
            uuid.UUID(created_by) if created_by else None,
            source_detail,
        )
        return {
            'id': str(new_id),
            'name': payload['full_name'],
            'status': payload.get('status', 'Active'),
            'risk': payload.get('risk', 'Low'),
            'diagnosis': payload.get('diagnosis', ''),
            'last_seen': None,
            'therapist_id': therapist_id,
            'dob': dob,
            'gender': payload.get('gender'),
            'source': source,
            'created_by': created_by,
            'source_detail': source_detail,
        }
