# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-19 - Redundant Database Indexes
**Learning:** SQLAlchemy's `index=True` on a column combined with a composite index starting with that column creates a redundant index. This wastes storage and slows down write operations.
**Action:** Always check `__table_args__` for composite indexes before adding `index=True` to a column. If the column is the leading part of a composite index, the single index is unnecessary.
