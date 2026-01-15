## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-15 - Static File Serving Path Traversal
**Vulnerability:** Path traversal in `serve_spa` endpoint in `app/main.py` using `os.path.join`.
**Learning:** Even with FastAPI, manual static file serving logic must be carefully validated using `Path.resolve().is_relative_to()`. `os.path.join` is not safe for user input.
**Prevention:** Use `pathlib.Path` resolution and boundary checks for all file serving.
