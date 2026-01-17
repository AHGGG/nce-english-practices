# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-14 - Daily Stats Aggregation Optimization
**Learning:** Sequential aggregations over time-series data (e.g., daily stats from 4 tables) cause N database round-trips. Using `UNION ALL` with `literal()` labels allows fetching all data in 1 round-trip.
**Action:** Replace multiple sequential `await session.execute()` calls with a single `union_all()` query when aggregation structures are compatible.
