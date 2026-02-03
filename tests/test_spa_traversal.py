import os
import shutil
import pytest
from starlette.testclient import TestClient
import sys
import importlib

# Setup fixture to create necessary directories and reload app.main
@pytest.fixture(scope="module")
def spa_client():
    # 1. Determine paths
    # tests/test_spa_traversal.py -> tests -> root
    current_file = os.path.abspath(__file__)
    root_dir = os.path.dirname(os.path.dirname(current_file))

    # apps/web/dist
    frontend_dist = os.path.join(root_dir, "apps", "web", "dist")

    # 2. Create fake frontend_dist if not exists
    created_dist = False
    if not os.path.exists(frontend_dist):
        os.makedirs(frontend_dist, exist_ok=True)
        created_dist = True

    # Create assets directory required by StaticFiles mount
    assets_dir = os.path.join(frontend_dist, "assets")
    os.makedirs(assets_dir, exist_ok=True)

    # 3. Create index.html inside dist
    index_path = os.path.join(frontend_dist, "index.html")
    with open(index_path, "w") as f:
        f.write("SPA INDEX PAGE")

    # 4. Create a secret file outside dist (in apps/web)
    apps_web = os.path.dirname(frontend_dist)
    secret_path = os.path.join(apps_web, "secret_config.txt")
    with open(secret_path, "w") as f:
        f.write("SUPER_SECRET_DATA")

    try:
        # 5. Import/Reload app.main
        # We need to make sure app.main detects the directory
        if "app.main" in sys.modules:
            module = importlib.reload(sys.modules["app.main"])
        else:
            import app.main
            module = app.main

        # 6. Create TestClient
        client = TestClient(module.app)
        yield client

    finally:
        # 7. Cleanup
        if created_dist:
            shutil.rmtree(frontend_dist)
        if os.path.exists(secret_path):
            os.remove(secret_path)

def test_spa_access_valid_file(spa_client):
    """Test accessing a valid file works."""
    response = spa_client.get("/index.html")
    assert response.status_code == 200
    assert response.text == "SPA INDEX PAGE"

def test_spa_traversal_attack(spa_client):
    """Test that path traversal attempts are blocked."""
    # Attempt to access secret_config.txt which is one level up from dist
    # Encoded .. (%2e%2e) to bypass client-side normalization
    response = spa_client.get("/%2e%2e/secret_config.txt")

    # Verification:
    # 1. Should NOT contain the secret data
    assert "SUPER_SECRET_DATA" not in response.text

    # 2. Should fallback to index.html (as per our fix logic)
    assert response.text == "SPA INDEX PAGE"

def test_spa_deep_traversal_attack(spa_client):
    """Test deeper traversal."""
    # Try to go up multiple levels to root or something
    response = spa_client.get("/%2e%2e/%2e%2e/README.md")

    # Should NOT return README content (assuming README has "NCE English Practice")
    assert "NCE English Practice" not in response.text
    assert response.text == "SPA INDEX PAGE"
