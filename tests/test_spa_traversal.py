import pytest
from fastapi.testclient import TestClient
from app.main import app
import os

client = TestClient(app)

def test_path_traversal_spa():
    """
    Test that the SPA fallback route does not allow path traversal to access sensitive files.
    """
    # Verify that we are effectively targeting the vulnerable route.
    # The vulnerability exists because serve_spa takes {full_path:path} and joins it.

    # We use URL encoded dots (%2e) to avoid client-side normalization
    # targeting app/config.py which contains "SECRET_KEY"
    response = client.get("/%2e%2e/%2e%2e/app/config.py")

    assert response.status_code == 200
    content = response.text

    # Check for leakage
    # If content contains "class Settings", it's likely the python file.
    if "class Settings" in content and "SECRET_KEY" in content:
        pytest.fail("Path Traversal Vulnerability: app/config.py content leaked!")

    # If fixed, it should return the content of index.html
    # In our test setup, index.html might be empty or specific string
    # We just assert it's NOT the python file.
