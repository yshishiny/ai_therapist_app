import uuid
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

    async def list_contacts(self, org_id: str) -> list[dict]:
        if self.db is None:
            return []
        rows = await self.db.fetch(
            "SELECT id, full_name, email, phone, role, organisation FROM contacts WHERE org_id = $1 ORDER BY full_name ASC",
            uuid.UUID(org_id),
        )
        return [dict(r) for r in rows]
