# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-31 - Redundant Index Removal
**Learning:** `unique=True` on a SQLAlchemy column definition usually creates an implicit unique index (dialect-dependent), making `index=True` redundant and potentially harmful (double indexing). Explicit `Index` definitions also supersede inline `index=True`.
**Action:** When defining models, check `__table_args__` and `unique` constraints before adding `index=True` to avoid duplication.
