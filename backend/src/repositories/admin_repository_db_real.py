import json
import uuid
from datetime import datetime, timezone
from typing import Any


class AdminRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_resources(self, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            "SELECT id, title, author, category, description, file_url, created_at FROM resources WHERE org_id = $1 ORDER BY created_at DESC",
            uuid.UUID(org_id),
        )
        return [dict(r) for r in rows]

    async def create_resource(
        self,
        org_id: str,
        user_id: str,
        title: str,
        author: str | None,
        category: str | None,
        description: str | None,
        file_url: str | None,
        tags: list[str],
    ) -> dict:
        """Create a new resource."""
        now = datetime.now(timezone.utc)
        row = await self.db.fetchrow(
            """INSERT INTO resources
                   (id, org_id, uploaded_by, title, author, category,
                    description, file_url, tags, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
               RETURNING id, title, author, category, description, file_url, created_at""",
            uuid.uuid4(),
            uuid.UUID(org_id),
            uuid.UUID(user_id),
            title,
            author,
            category,
            description,
            file_url,
            json.dumps(tags),
            now,
        )
        return dict(row)

    async def list_contacts(self, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            "SELECT id, full_name, email, phone, role, organisation FROM contacts WHERE org_id = $1 ORDER BY full_name ASC",
            uuid.UUID(org_id),
        )
        return [dict(r) for r in rows]

    async def create_contact(
        self,
        org_id: str,
        full_name: str,
        email: str | None,
        phone: str | None,
        role: str | None,
        organisation: str | None,
        notes: str | None,
    ) -> dict:
        """Create a new contact."""
        row = await self.db.fetchrow(
            """INSERT INTO contacts
                   (id, org_id, full_name, email, phone, role, organisation, notes)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               RETURNING id, full_name, email, phone, role, organisation""",
            uuid.uuid4(),
            uuid.UUID(org_id),
            full_name,
            email,
            phone,
            role,
            organisation,
            notes,
        )
        return dict(row)

    async def list_assessment_questions(
        self,
        org_id: str,
        assessment_id: str,
    ) -> list[dict]:
        """List all questions for an assessment."""
        if self.db is None:
            return []
        rows = await self.db.fetch(
            """SELECT id, assessment_id, question_index, question_text,
                      response_type, options
               FROM assessment_questions
               WHERE org_id=$1 AND assessment_id=$2
               ORDER BY question_index ASC""",
            uuid.UUID(org_id),
            assessment_id,
        )
        items = []
        for row in rows:
            item = dict(row)
            options = item.get("options")
            item["options"] = json.loads(options) if isinstance(options, str) else options
            items.append(item)
        return items

    async def create_assessment_question(
        self,
        org_id: str,
        assessment_id: str,
        question_index: int,
        question_text: str,
        response_type: str,
        options: list | None,
        reverse_scored: bool,
    ) -> dict:
        """Create or update an assessment question."""
        row = await self.db.fetchrow(
            """INSERT INTO assessment_questions
                   (id, org_id, assessment_id, question_index, question_text,
                    response_type, options, reverse_scored)
               VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
               ON CONFLICT (org_id, assessment_id, question_index)
               DO UPDATE SET question_text=EXCLUDED.question_text,
                             response_type=EXCLUDED.response_type,
                             options=EXCLUDED.options
               RETURNING id, assessment_id, question_index, question_text, response_type, options""",
            uuid.uuid4(),
            uuid.UUID(org_id),
            assessment_id,
            question_index,
            question_text,
            response_type,
            json.dumps(options) if options else None,
            reverse_scored,
        )
        item = dict(row)
        options_val = item.get("options")
        item["options"] = json.loads(options_val) if isinstance(options_val, str) else options_val
        return item
