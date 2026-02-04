# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-22 - Redundant Database Indexes
**Learning:** SQLAlchemy's `index=True` on a column creates an index with a default name. If `__table_args__` also defines an `Index` on that column (or a composite index starting with that column), or if `unique=True` is set, redundant indexes are created. This doubles write overhead and storage for those columns.
**Action:** Audit models for `index=True` when explicit `Index` or `unique=True` exists. Also, use `JSON().with_variant(JSONB, "postgresql")` for JSON columns to support SQLite tests.
