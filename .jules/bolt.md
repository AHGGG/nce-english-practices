# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-30 - Database Index Deduplication
**Learning:** SQLAlchemy's `mapped_column(..., index=True)` and explicit `Index()` in `__table_args__` are additive. If a column is already the leading column of a composite index, or has `unique=True`, adding `index=True` creates a redundant B-Tree index that consumes storage and slows down writes without improving read performance.
**Action:** Review `app/models/orm.py` to ensure columns with `index=True` are not already covered by composite indexes (as a prefix) or unique constraints. Remove redundant `index=True` parameters.
