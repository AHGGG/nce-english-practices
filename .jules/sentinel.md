## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-02-03 - Path Traversal in SPA Fallback
**Vulnerability:** The SPA fallback route `/{full_path:path}` in `app/main.py` blindly joined user input with the static file directory, allowing path traversal using `..` (encoded as `%2e%2e`).
**Learning:** `os.path.join` + `os.path.isfile` is insufficient validation. Testing conditional routes (like `if os.path.exists(dist):`) requires constructing the environment and reloading the module (`importlib.reload`) in the test fixture.
**Prevention:** Use `os.path.commonpath([base, target]) == base` (or `pathlib`'s `is_relative_to`) to validate that the resolved path is strictly within the intended directory.
