## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-22 - Testing Path Traversal with Clients
**Vulnerability:** Path Traversal via URL-encoded characters in SPA fallback route.
**Learning:** `httpx` and other high-level HTTP clients normalize paths (collapsing `..`), making straightforward path traversal tests pass false negatives.
**Prevention:** When writing regression tests for path traversal, use URL encoding (`%2e%2e` for `..`) to bypass client-side normalization and test the server's path decoding and validation logic.
