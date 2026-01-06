## 2024-05-22 - Initial Entry
**Learning:** Initialized Bolt's journal.
**Action:** Always check here for performance insights.

## 2026-01-06 - Bucket Aggregation Optimization
**Learning:** When generating histograms or memory curves (data bucketed by range), executing one query per bucket (N+1-like issue) is significantly slower than fetching all raw data and bucketing in memory, especially when N is small but the query overhead is high.
**Action:** Prefer fetching raw data with a single query using `where(min < field < max)` and then aggregating in Python using a dictionary lookup for ranges, unless the dataset is massive (millions of rows).
