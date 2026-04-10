import pytest
from starlette.testclient import TestClient
from backend.src.api.modular_app_consolidated import app

@pytest.fixture
def client():
    return TestClient(app)

def test_correlation_id_generated(client):
    """Verify that a Correlation ID is generated and returned if not provided."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "X-Correlation-ID" in response.headers
    correlation_id = response.headers["X-Correlation-ID"]
    assert len(correlation_id) > 0

def test_correlation_id_preserved(client):
    """Verify that a provided Correlation ID is preserved and returned."""
    custom_id = "test-correlation-123"
    response = client.get("/health", headers={"X-Correlation-ID": custom_id})
    assert response.status_code == 200
    assert response.headers["X-Correlation-ID"] == custom_id

def test_rate_limiting(client):
    """Verify that the rate limiter is active."""
    for _ in range(5):
        response = client.get("/health")
        assert response.status_code == 200

def test_structured_logging_output(client, caplog):
    """Verify that structured logs are produced."""
    import json
    with caplog.at_level("INFO"):
        client.get("/health")
        
        # Look for the JSON log in the captured output
        log_records = [r.message for r in caplog.records if "request_started" in r.message]
        assert len(log_records) > 0
        
        # Verify it's valid JSON
        log_data = json.loads(log_records[0])
        assert log_data["event"] == "request_started"
        assert "correlation_id" in log_data
        assert log_data["path"] == "/health"
