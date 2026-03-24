from backend.app import app as runtime_app
from backend.src.api.modular_app_consolidated import app as consolidated_app


def test_runtime_entrypoint_uses_consolidated_app():
    assert runtime_app is consolidated_app
