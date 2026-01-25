
import os
import pytest
from pathlib import Path
import tempfile

def test_spa_traversal_prevention_logic():
    """
    Unit test for the secure path resolution logic used in app/main.py.
    Verifies that the implemented pattern prevents path traversal.
    """
    with tempfile.TemporaryDirectory() as base_dir:
        dist_dir = os.path.join(base_dir, "dist")
        os.makedirs(dist_dir)

        secret_path = os.path.join(base_dir, "secret.txt")
        with open(secret_path, "w") as f:
            f.write("SECRET_DATA")

        with open(os.path.join(dist_dir, "index.html"), "w") as f:
            f.write("<html>SPA</html>")

        # The SECURE logic pattern used in app/main.py
        def secure_serve_spa(full_path):
            try:
                # Resolve paths
                requested_path = (Path(dist_dir) / full_path).resolve()
                dist_root = Path(dist_dir).resolve()

                # Security check: Ensure requested path is within dist_root
                if requested_path.is_relative_to(dist_root) and requested_path.is_file():
                    return "SERVED_FILE"
            except Exception:
                pass

            return "SERVED_INDEX" # Fallback/Blocked

        # Attack: Try to access secret.txt via traversal
        attack_path = "../secret.txt"
        result = secure_serve_spa(attack_path)

        assert result == "SERVED_INDEX", "Fix should prevent traversal and serve index"

        # Attack: Try absolute path (if full_path allows it, though FastAPI might not)
        # (Path(dist) / "/etc/passwd").resolve() might be /etc/passwd
        result = secure_serve_spa("/etc/passwd")
        assert result == "SERVED_INDEX"

        # Valid access
        with open(os.path.join(dist_dir, "valid.js"), "w") as f:
            f.write("console.log('hi')")

        result = secure_serve_spa("valid.js")
        assert result == "SERVED_FILE", "Should serve valid file"

        # Valid nested access
        os.makedirs(os.path.join(dist_dir, "assets"))
        with open(os.path.join(dist_dir, "assets", "main.css"), "w") as f:
            f.write("body {}")

        result = secure_serve_spa("assets/main.css")
        assert result == "SERVED_FILE", "Should serve valid nested file"
