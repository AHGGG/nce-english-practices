import pytest
from fastapi.testclient import TestClient
import os
import tempfile
from pathlib import Path
from unittest.mock import patch
import sys

# Check if we can test this
# We need app.main to have registered the route, which requires frontend/dist to exist at import time.
# We can't easily force that here if it's not present.
from app.main import app

# Check if serve_spa route exists
route_exists = any(r.path == "/{full_path:path}" for r in app.routes)

@pytest.mark.skipif(not route_exists, reason="SPA route not registered (frontend/dist missing)")
def test_static_files_traversal():
    """
    Test that the static file serving endpoint protects against path traversal.
    """
    # Create a temporary directory structure
    with tempfile.TemporaryDirectory() as tmpdir:
        base = Path(tmpdir)
        frontend_dir = base / "frontend_dist"
        frontend_dir.mkdir()

        # Create a secret file outside frontend_dist
        secret_file = base / "secret.txt"
        secret_file.write_text("SECRET_DATA")

        # Create a valid file inside frontend_dist
        valid_file = frontend_dir / "style.css"
        valid_file.write_text("body { color: red; }")

        # Create index.html for fallback
        index_file = frontend_dir / "index.html"
        index_file.write_text("<html>index</html>")

        # Patch the frontend_dist variable in app.main
        with patch("app.main.frontend_dist", str(frontend_dir)), \
             patch("app.main.index_html", str(index_file)):

            client = TestClient(app)

            # 1. Test valid file access
            response = client.get("/style.css")
            assert response.status_code == 200
            assert "body { color: red; }" in response.text

            # 2. Test traversal attempt
            response = client.get("/..%2fsecret.txt")

            # If fixed, it should NOT find the secret file.
            # It should fallback to index.html or 404.
            if response.status_code == 200:
                assert "SECRET_DATA" not in response.text, "VULNERABILITY DETECTED"
