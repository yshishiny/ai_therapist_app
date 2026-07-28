import uuid
from datetime import datetime, timezone
from typing import Any

# Every session-note read returns the same shape, so the list, the sign-off
# PATCH and the create response cannot drift apart and hand the API different
# field sets.
_NOTE_COLUMNS = (
    'id', 'patient_id', 'template', 'subjective', 'objective', 'assessment',
    'plan', 'free_text', 'ai_draft_summary', 'therapist_approved', 'created_at',
)
_NOTE_SELECT = ', '.join(_NOTE_COLUMNS)
# Same list qualified with the UPDATE's table alias, for its RETURNING clause.
_NOTE_SELECT_SN = ', '.join(f'sn.{c}' for c in _NOTE_COLUMNS)


class SessionRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_sessions(self, patient_id: str, org_id: str) -> list[dict]:
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
            f"""SELECT {_NOTE_SELECT}
               FROM session_notes WHERE patient_id=$1 ORDER BY created_at DESC""",
            uuid.UUID(patient_id),
        )
        return [self._row_to_dict(row) for row in rows]

    async def set_note_approval(
        self, patient_id: str, note_id: str, org_id: str, therapist_approved: bool
    ) -> dict | None:
        """Sign a session note off (or withdraw the sign-off).

        Returns None when the note does not exist, does not belong to that
        patient, or the patient is not in the caller's org -- the route turns
        all three into the same 404 so a cross-org probe cannot distinguish
        "wrong org" from "no such note".

        The org check is part of the UPDATE's WHERE clause rather than a
        separate SELECT: a two-statement check-then-write can be raced, and the
        thing being written here is a clinical attestation.
        """
        if self.db is None:
            return None
        row = await self.db.fetchrow(
            f"""UPDATE session_notes sn
                SET therapist_approved = $1, updated_at = NOW()
                FROM patients p
                WHERE sn.id = $2
                  AND sn.patient_id = $3
                  AND p.id = sn.patient_id
                  AND p.org_id = $4
                RETURNING {_NOTE_SELECT_SN}""",
            therapist_approved,
            uuid.UUID(note_id),
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
        )
        return self._row_to_dict(row) if row else None

    async def create_session(self, patient_id: str, payload: dict, org_id: str) -> dict:
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
        await self.db.execute(
            """INSERT INTO session_notes
                   (id, patient_id, template, subjective, objective, assessment,
                    plan, free_text, ai_draft_summary, therapist_approved,
                    created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,FALSE,$10,$10)""",
            new_id,
            uuid.UUID(patient_id),
            payload.get('template', 'SOAP'),
            payload.get('subjective'),
            payload.get('objective'),
            payload.get('assessment'),
            payload.get('plan'),
            payload.get('free_text'),
            payload.get('ai_draft_summary'),
            now,
        )
        await self.db.execute(
            "UPDATE patients SET last_seen=$1 WHERE id=$2",
            now,
            uuid.UUID(patient_id),
        )
        return {
            'id': str(new_id),
            'patient_id': patient_id,
            'template': payload.get('template', 'SOAP'),
            'subjective': payload.get('subjective'),
            'objective': payload.get('objective'),
            'assessment': payload.get('assessment'),
            'plan': payload.get('plan'),
            'free_text': payload.get('free_text'),
            'ai_draft_summary': payload.get('ai_draft_summary'),
            # Written explicitly above rather than left to the column default,
            # so a new note is always countable by the dashboard's
            # "therapist_approved = FALSE" query. A null there would make the
            # note invisible to the counter instead of pending.
            'therapist_approved': False,
            'created_at': now,
        }

    @staticmethod
    def _row_to_dict(row: Any) -> dict:
        """Map an asyncpg Record to a plain dict, stringifying every UUID.

        By type, not by an explicit key list: every UUID column here lands in a
        `str`-typed Pydantic field and returning the raw uuid.UUID has produced
        a 500 in this codebase repeatedly.
        """
        data = dict(row)
        for key, value in data.items():
            if isinstance(value, uuid.UUID):
                data[key] = str(value)
        # Nullable in deployed databases; the API contract is a plain bool.
        data['therapist_approved'] = bool(data.get('therapist_approved'))
        return data
