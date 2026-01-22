# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-22 - Redundant Index Definitions
**Learning:** In SQLAlchemy, defining `index=True` on a column that is already part of a named index in `__table_args__` (or has `unique=True`) creates a duplicate index, wasting write performance and storage.
**Action:** Always check `__table_args__` before adding `index=True` to column definitions. If an explicit named index exists, omit `index=True` and add a comment.
