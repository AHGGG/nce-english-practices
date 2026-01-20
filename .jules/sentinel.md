## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-20 - Timing Attack in Authentication
**Vulnerability:** User enumeration via timing attack in `authenticate_user`. The function returned early when the user was not found, bypassing the expensive `verify_password` (bcrypt) call.
**Learning:** Returning early in authentication flows based on user existence leaks valid usernames via timing differences (hundreds of ms).
**Prevention:** Always perform the same expensive work (password hashing) regardless of user existence. Use a pre-computed dummy hash to simulate the workload for non-existent users.
