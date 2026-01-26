import os
from fastapi.testclient import TestClient
from app.main import app

# Ensure dist dir exists so the route is registered (if not already)
# Note: app/main.py checks this on import. If it wasn't present then, the route wouldn't exist.
# Since we are running in an environment where we pre-created it, it should be fine.

client = TestClient(app)

def test_spa_path_traversal():
    """
    Test that path traversal attempts in the SPA fallback route are blocked
    and return the index.html content instead of sensitive files.
    """
    # Attempt to access app/main.py via traversal
    # We use encoded dots to bypass any potential client-side normalization
    target_path = "/%2e%2e/%2e%2e/%2e%2e/app/main.py"

    response = client.get(target_path)

    # It should succeed (200 OK) because it falls back to index.html
    assert response.status_code == 200

    # But the content should NOT be the python source code
    content = response.text
    assert "from fastapi import FastAPI" not in content

    # It should match the index.html content (which is <html></html> in our setup)
    # We check if it looks like HTML or specifically our dummy content
    assert "<html" in content or "doctype html" in content.lower()

def test_valid_static_file():
    """Test that valid static files are still served."""
    # Create a dummy asset
    asset_path = "apps/web/dist/test.txt"
    os.makedirs(os.path.dirname(asset_path), exist_ok=True)
    with open(asset_path, "w") as f:
        f.write("safe content")

    try:
        response = client.get("/test.txt")
        assert response.status_code == 200
        assert response.text == "safe content"
    finally:
        if os.path.exists(asset_path):
            os.remove(asset_path)
