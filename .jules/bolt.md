## 2024-05-22 - Initial Entry
**Learning:** Initialized Bolt's journal.
**Action:** Always check here for performance insights.

## 2026-01-05 - N+1 Query Elimination in Aggregation
**Learning:** Replacing a loop of queries with a single query + in-memory aggregation is a massive win for things like histograms or memory curves.
**Action:** Always check for `for bucket in buckets: await db.execute(...)` patterns.
**Learning:** Avoid hardcoded magic numbers (e.g., `WHERE interval < 45`) in optimization filters. They make the code brittle if configuration changes.
**Action:** Dynamically calculate bounds from the configuration (e.g., `max(r[1] for r in bucket_ranges.values())`).
## 2026-01-06 - Bucket Aggregation Optimization
**Learning:** When generating histograms or memory curves (data bucketed by range), executing one query per bucket (N+1-like issue) is significantly slower than fetching all raw data and bucketing in memory, especially when N is small but the query overhead is high.
**Action:** Prefer fetching raw data with a single query using `where(min < field < max)` and then aggregating in Python using a dictionary lookup for ranges, unless the dataset is massive (millions of rows).
