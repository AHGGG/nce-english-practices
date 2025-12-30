## 2024-05-22 - Path Traversal in File Serving
**Vulnerability:** Path traversal in `app/api/routers/dictionary.py` allowed access to arbitrary files via `../` sequences in the `file_path` parameter.
**Learning:** `os.path.join` does not prevent traversal if the joined path contains `../`. `FastAPI` path parameters can accept encoded traversal sequences.
**Prevention:** Always resolve paths with `os.path.abspath` and check `os.path.commonpath` to ensure the resolved path stays within the intended root directory.
