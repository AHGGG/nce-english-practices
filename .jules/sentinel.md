## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-15 - SSRF via HTTP Redirects
**Vulnerability:** SSRF protection in `PodcastService` initially relied on `httpx` following redirects, which bypasses validation if the initial URL redirects to a private IP.
**Learning:** HTTP clients often follow redirects to any IP. Validating only the input URL is a "Time-of-Check to Time-of-Use" style gap if redirects are automatic.
**Prevention:** Explicitly disable `follow_redirects` and implement a manual fetch loop that validates the resolved IP of every URL in the redirect chain before connection.
