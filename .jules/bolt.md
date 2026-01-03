# Bolt's Journal

## 2024-05-22 - Initial Entry
**Learning:** Initialized Bolt's journal.
**Action:** Always check here for performance insights.

## 2024-05-22 - Combining Aggregate Queries
**Learning:** SQLAlchemy queries that perform independent aggregations (sum, count) on the same table with similar filters can be combined into a single query using `func.sum(case(...))`. This is especially useful for dashboard endpoints where multiple metrics are calculated over the same time range.
**Action:** When seeing multiple `select(func.sum(...))` statements targeting the same table/time-window, combine them to reduce database round-trips.
