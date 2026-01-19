## 2026-01-14 - Path Traversal in File Providers
**Vulnerability:** Path Traversal in `EpubProvider` allowed access to arbitrary files via `epub.read_epub` (if ZIP) or file existence probing.
**Learning:** `pathlib.Path` / `str` operator allows absolute paths to override the base path, and `..` components are not resolved automatically until `resolve()` is called.
**Prevention:** Always use `.resolve()` on the combined path and check `.is_relative_to(base_dir.resolve())` before accessing the file system.

## 2026-01-19 - Timezone Compatibility in Account Locking
**Vulnerability:** Naive vs Aware datetime comparison error in Account Locking logic.
**Learning:** `TIMESTAMP` columns in Postgres without timezone information are returned as offset-naive datetimes by SQLAlchemy. Comparing these with offset-aware datetimes (like `datetime.now(timezone.utc)`) raises a `TypeError`.
**Prevention:** Use `datetime.utcnow()` (or equivalent naive UTC time) when working with `TIMESTAMP` (without time zone) columns, or strictly use `TIMESTAMP(timezone=True)` in schema definitions.
