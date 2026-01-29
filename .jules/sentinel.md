## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-29 - Path Traversal in SPA Fallback
**Vulnerability:** Path Traversal in `app/main.py` SPA fallback route allowed reading arbitrary files via `../` (URL encoded as `%2e%2e`) path segments because `os.path.join` was used without validating if the resolved path remained within the intended directory.
**Learning:** `os.path.join` preserves `..` components, and HTTP frameworks/clients might normalize paths differently. Explicit validation using `os.path.abspath` and `os.path.commonpath` (or `pathlib`'s `is_relative_to`) is essential for any file serving logic that accepts user input.
**Prevention:** Use `os.path.abspath` to resolve the final path and `os.path.commonpath` to ensure it starts with the trusted base directory.
