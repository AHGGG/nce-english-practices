## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-02-01 - SSRF Protection via DNS Resolution
**Vulnerability:** `httpx` (and most HTTP clients) do not automatically block access to private/loopback IPs, allowing SSRF if a user can control the URL.
**Learning:** `socket.getaddrinfo` is blocking and must be run in a thread executor when called from async contexts. Validation logic must ensure `ValueError` from "invalid IP string" checks doesn't mask actual "restricted IP" errors.
**Prevention:** Use `app.core.utils.validate_url_security` before making outbound requests. Ensure to handle `ValueError` and map it to appropriate HTTP errors if needed.
