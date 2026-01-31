## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-31 - SSRF in Podcast Fetching
**Vulnerability:** The podcast subscription and proxy endpoints (`/api/podcast/subscribe`, `_proxy_image`) allowed users to supply arbitrary URLs. The application fetched these URLs using `httpx` without validating the destination IP. This permitted blind SSRF attacks against internal services (like localhost or private network IPs).
**Learning:** High-level HTTP clients like `httpx` (and `requests`) do not automatically block private or loopback IP ranges. They will happily follow redirects to `127.0.0.1`.
**Prevention:** Implement explicit DNS resolution and IP validation *before* making the request. Use `socket.getaddrinfo` to resolve the hostname, and check each IP against `ipaddress` properties (`is_private`, `is_loopback`). Note that this must be run in a threadpool if called from async context to avoid blocking the event loop. This defense-in-depth approach is necessary even if the network environment provides some isolation.
