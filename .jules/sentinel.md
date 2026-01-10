## 2026-01-09 - Path Traversal Vulnerability in Dictionary Asset Serving
**Vulnerability:** The `get_dict_asset` endpoint in `app/api/routers/dictionary.py` accepted a `file_path` parameter and used `os.path.join` to construct the full path without validating if the resulting path was still within the intended `resources/dictionaries` directory. This allowed attackers to traverse up the directory tree using `..` sequences (e.g., `../../secret.txt`) and access sensitive system files.
**Learning:** `os.path.join` does not sanitize paths or prevent traversal. Trusting user input for file system operations without validation is a critical risk.
**Prevention:**
1.  **Use `pathlib.Path`:** It offers robust path manipulation methods.
2.  **Resolve Paths:** Use `.resolve()` to canonicalize both the base directory and the user-supplied path (resolving symlinks and `..` segments).
3.  **Check Containment:** Use `.is_relative_to(base_dir)` (Python 3.9+) to rigorously verify that the resolved target path is a child of the secure base directory.
4.  **Fail Closed:** Deny access immediately if the path is outside the boundary.
