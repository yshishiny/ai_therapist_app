from typing import Any


def get_db() -> Any:
    """Temporary modular DB dependency placeholder.

    During migration this will be replaced by the pooled asyncpg dependency
    currently initialized by the monolithic backend.
    """
    return None
