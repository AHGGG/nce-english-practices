## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-26 - Path Traversal in SPA Fallback Route
**Vulnerability:** The SPA catch-all route `/{full_path:path}` in `app.main` blindly joined user input with the static directory using `os.path.join`.
**Learning:** FastAPI's `path` parameter captures the full path including slashes, but unlike standard static files mount, it doesn't automatically prevent traversal. `os.path.join` allows traversal if the second argument contains `..`.
**Prevention:** Use `os.path.commonpath` (or `pathlib`'s `is_relative_to`) to verify the resolved path is strictly within the trusted root directory before serving.
