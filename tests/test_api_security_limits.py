
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_remote_log_size_limit():
    """
    Verify that the /api/logs endpoint rejects payloads that are too large.
    This protects against DoS attacks consuming memory/disk.
    """

    # 1. Test acceptable message size
    payload_ok = {
        "level": "info",
        "message": "A" * 9000, # Under 10k limit
        "timestamp": "2024-01-01T00:00:00"
    }
    response = client.post("/api/logs", json=payload_ok)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    # 2. Test message size exceeding limit
    payload_too_large = {
        "level": "info",
        "message": "A" * 10001, # Over 10k limit
        "timestamp": "2024-01-01T00:00:00"
    }
    response = client.post("/api/logs", json=payload_too_large)
    assert response.status_code == 422, "Should reject message > 10k chars"
    assert "String should have at most 10000 characters" in response.text or "less than or equal to 10000" in response.text

    # 3. Test data size exceeding limit
    # Construct a large dict
    large_dict = {"key": "A" * 50000}
    payload_data_too_large = {
        "level": "info",
        "message": "Small message",
        "data": large_dict,
        "timestamp": "2024-01-01T00:00:00"
    }
    response = client.post("/api/logs", json=payload_data_too_large)
    assert response.status_code == 422, "Should reject data > 50KB"
    assert "Data payload too large" in response.text
