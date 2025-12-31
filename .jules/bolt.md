# Bolt's Journal

## 2024-05-22 - Initial Entry
**Learning:** Initialized Bolt's journal.
**Action:** Always check here for performance insights.

## 2024-05-22 - SQL Aggregation Optimization
**Learning:** Combining multiple aggregation queries (SUM, COUNT) into a single GROUP BY query significantly reduces DB round-trips. In `get_user_stats`, replacing 3 queries with 1 improved performance by ~35% (7.5ms -> 4.9ms).
**Action:** Look for patterns where `func.sum()` is called separately for different fields of the same table. Combine them.
