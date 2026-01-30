## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-20 - SSRF in Podcast Service
**Vulnerability:** `podcast_service` and `_proxy_image` fetched user-provided URLs using `httpx` without validating the destination IP.
**Learning:** `httpx` (and standard libraries) do not prevent access to private network ranges by default. Blind SSRF was possible via RSS feed parsing.
**Prevention:** Explicitly resolve the hostname using `socket.getaddrinfo` and check against private/loopback IP ranges before making the request.
