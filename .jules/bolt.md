# Bolt's Journal

## 2026-01-14 - Stats Aggregation Optimization
**Learning:** Combining multiple independent scalar aggregations into a single query using subqueries significantly reduces database round-trips (1 vs 4) and latency (~36% improvement in tests).
**Action:** When fetching dashboard-style metrics from multiple tables, prefer `select(subq1.c.col, subq2.c.col)` over sequential `await session.execute()` calls.

## 2026-01-14 - React List Rendering with Large Sets
**Learning:** When passing a large `Set` (e.g., highlighted words) to many child components, recreating the `Set` in the parent triggers O(N) re-renders even if `React.memo` is used (because the Set reference changes).
**Action:** Pass a `lastModifiedId` (or similar signal) to children and use a custom `arePropsEqual` comparator in `React.memo`. This allows children to check if the modification affects *them* specifically (e.g., `!text.includes(lastModifiedId)`), enabling O(1) updates for O(N) lists.
