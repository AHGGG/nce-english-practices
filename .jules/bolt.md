# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-24 - Time Series Aggregation Optimization
**Learning:** When aggregating time-series data from multiple tables (e.g., daily stats), using `UNION ALL` with a common schema allows fetching all data in a single round-trip, replacing multiple sequential queries.
**Action:** Use `union_all(select(...), select(...))` to combine independent time-series queries.
