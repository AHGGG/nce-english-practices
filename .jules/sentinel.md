## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2024-05-22 - SSRF in Podcast Service
**Vulnerability:** The podcast service fetched RSS feeds and proxied images from arbitrary URLs provided by users without validating if they pointed to internal network resources (SSRF).
**Learning:** `httpx` and other HTTP clients do not automatically block private IPs. DNS resolution is blocking and must be run in a threadpool in async applications to avoid freezing the event loop.
**Prevention:** Use `validate_url_security` (which resolves DNS and checks IP ranges) before making any external HTTP request. Ensure DNS resolution happens in a threadpool.
