import pytest
from fastapi.testclient import TestClient
from app.main import app
import os

client = TestClient(app)

def test_spa_path_traversal_protection():
    """
    Verify that the SPA fallback route does not allow accessing files outside
    the frontend_dist directory using path traversal sequences.
    """
    # Ensure the target file exists for the test to be valid (app/main.py always exists)
    target_file = "app/main.py"
    assert os.path.exists(target_file), "Target file for traversal test does not exist"

    # Ensure frontend_dist exists and has an index.html so serve_spa is active and can fallback
    # The previous steps might have created it, but let's be sure.
    os.makedirs("apps/web/dist", exist_ok=True)
    if not os.path.exists("apps/web/dist/index.html"):
        with open("apps/web/dist/index.html", "w") as f:
            f.write("<html>SPA</html>")

    # Construct a traversal path that would reach app/main.py from apps/web/dist
    # apps/web/dist -> (..) -> apps/web -> (..) -> apps -> (..) -> ROOT -> app/main.py
    # We use URL encoded dots %2e%2e to bypass potential client-side normalization
    traversal_path = "%2e%2e/%2e%2e/%2e%2e/app/main.py"

    response = client.get(f"/{traversal_path}")

    # If vulnerable, it returns 200 and the content of main.py
    # If fixed, it should return 200 (index.html) or 404 (if blocked and no fallback)
    # But serve_spa falls back to index.html, so we expect index.html content.

    if response.status_code == 200:
        content = response.text
        # Check if we got the python file
        if "FastAPI" in content and "serve_spa" in content:
            pytest.fail("Vulnerability Detected: Able to read app/main.py via path traversal")

        # Check if we got the SPA fallback (which is the desired behavior for invalid paths)
        # Note: In real app index.html might be different, but for this test environment we made a dummy one.
        # If the real index.html is there, we might need to check for that.
        pass
    else:
        # 404 is also acceptable if we decide to return 404 for traversal attempts
        pass
