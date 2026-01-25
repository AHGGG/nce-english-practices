## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-25 - Path Traversal in SPA Catch-All Route
**Vulnerability:** The SPA fallback route `/{full_path:path}` in `app/main.py` blindly joined user input with `frontend_dist` using `os.path.join`, allowing traversal to parent directories.
**Learning:** Catch-all routes in FastAPI/Starlette receive the full path including slashes. `os.path.join` does not sanitize `..` segments, and `FileResponse` serves whatever path it gets if it exists.
**Prevention:** Use `pathlib.Path(base) / user_input` followed by `.resolve()` and `.is_relative_to(base.resolve())` to strictly enforce directory confinement.
