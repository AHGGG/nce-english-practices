## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-02-05 - SSRF in HTTP Clients
**Vulnerability:** Unrestricted HTTP requests in `podcast_service.parse_feed` and `_proxy_image` allowed SSRF to internal network services.
**Learning:** `httpx.AsyncClient` defaults to allowing requests to any IP, including private ranges and localhost. It also follows redirects by default.
**Prevention:** Validate the resolved IP address against private/loopback ranges using `socket.getaddrinfo` (in a threadpool) before making requests. Disable `follow_redirects` where possible, or validate each redirect hop.
