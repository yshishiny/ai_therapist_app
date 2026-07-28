import json
import uuid
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote_plus

# Every column a resource is returned with, in one place: the list, the create
# and the review update all hand their rows to the same mapper, so they must
# all select the same thing.
_RESOURCE_COLUMNS = (
    "id, title, author, category, description, file_url, tags, created_at, "
    "review_status, reviewed_by, reviewed_at, review_note"
)


class AdminRepositoryDbReal:
    def __init__(self, db: Any):
        self.db = db

    async def list_resources(self, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            f"SELECT {_RESOURCE_COLUMNS} FROM resources WHERE org_id = $1 ORDER BY created_at DESC",
            uuid.UUID(org_id),
        )
        return [self._resource_row(r) for r in rows]

    async def update_resource_review(
        self,
        org_id: str,
        resource_id: str,
        status: str,
        note: str | None,
        reviewed_by: str,
    ) -> dict | None:
        """Record one clinician's citation-check decision on one library item.

        Returns None when the resource is not in this org -- or when the id is
        not a UUID at all -- so the route answers 404 instead of leaking
        whether another practice holds that row.

        The caller is responsible for validating `status`; the column has a
        CHECK constraint as a backstop, not as the error path.
        """
        if self.db is None:
            return None
        try:
            resource_uuid = uuid.UUID(resource_id)
        except ValueError:
            return None
        row = await self.db.fetchrow(
            f"""UPDATE resources
                   SET review_status = $1,
                       review_note   = $2,
                       reviewed_by   = $3,
                       reviewed_at   = $4
                 WHERE id = $5 AND org_id = $6
             RETURNING {_RESOURCE_COLUMNS}""",
            status,
            note,
            uuid.UUID(reviewed_by),
            datetime.now(timezone.utc),
            resource_uuid,
            uuid.UUID(org_id),
        )
        return self._resource_row(row) if row else None

    @staticmethod
    def _lookup(
        category: str | None,
        title: str | None,
        author: str | None,
        file_url: str | None,
    ) -> tuple[str, str]:
        """(url, what that url actually is) for one library item.

        Only the 29 videos carry a file_url. All 32 books and all 30 papers
        have none, so the best we can honestly offer for those is a search --
        and lookup_kind says so, for the UI to label. Do NOT substitute a
        guessed DOI, ISBN or publisher page: a fabricated citation link inside
        a citation-checking tool defeats the entire exercise.

        Matches backend/export_library_for_review.py so the spreadsheet and the
        app send a reviewer to the same place.
        """
        if file_url:
            return file_url, "source"
        query = " ".join(filter(None, [title, author]))
        q = quote_plus(query[:250])
        if category == "PAPER":
            return f"https://scholar.google.com/scholar?q={q}", "search"
        if category == "BOOK":
            return f"https://www.google.com/search?tbm=bks&q={q}", "search"
        return f"https://www.google.com/search?q={q}", "search"

    @staticmethod
    def _resource_row(row: Any) -> dict:
        item = dict(row)
        item["id"] = str(item["id"])
        tags = item.get("tags")
        item["tags"] = json.loads(tags) if isinstance(tags, str) else (tags or [])
        # asyncpg hands back a UUID object, which pydantic's str field rejects.
        if item.get("reviewed_by") is not None:
            item["reviewed_by"] = str(item["reviewed_by"])
        item["lookup_url"], item["lookup_kind"] = AdminRepositoryDbReal._lookup(
            item.get("category"),
            item.get("title"),
            item.get("author"),
            item.get("file_url"),
        )
        return item

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
            f"""INSERT INTO resources
                   (id, org_id, uploaded_by, title, author, category,
                    description, file_url, tags, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
               RETURNING {_RESOURCE_COLUMNS}""",
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
        return self._resource_row(row)

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
