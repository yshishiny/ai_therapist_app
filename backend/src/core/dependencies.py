from dataclasses import dataclass
from typing import Any

from backend.src.core.db import get_db


@dataclass
class RequestContext:
    org_id: str = '00000000-0000-0000-0000-000000000000'
    user_id: str = 'migration-user'
    role: str = 'admin'


def get_request_context() -> RequestContext:
    return RequestContext()


def get_db_and_context() -> tuple[Any, RequestContext]:
    return get_db(), get_request_context()
