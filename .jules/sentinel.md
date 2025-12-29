## 2025-12-29 - Path Traversal Vulnerability
**Vulnerability:** The `get_dict_asset` endpoint allowed arbitrary file read via path traversal because it used `os.path.join` with user-controlled input without validating the resolved path.
**Learning:** `os.path.join` does not prevent directory traversal (using `..`) and if the joined component is absolute, it ignores the base path.
**Prevention:** Always use `os.path.abspath` and `os.path.commonpath` (or `pathlib.Path.resolve().is_relative_to()`) to ensure the resolved path stays within the intended directory.
