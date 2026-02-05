# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-22 - Daily Stats Optimization
**Learning:** Replaced 5 sequential aggregate queries with a single `UNION ALL` query to fetch stats for different activities. This reduced DB round-trips from N to 1. Using `literal('type')` allows distinguishing rows in the combined result.
**Action:** Use `UNION ALL` with discriminator columns when fetching similar aggregate metrics from multiple tables.
