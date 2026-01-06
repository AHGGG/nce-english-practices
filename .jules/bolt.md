## 2024-05-22 - Initial Entry
**Learning:** Initialized Bolt's journal.
**Action:** Always check here for performance insights.

## 2026-01-05 - N+1 Query Elimination in Aggregation
**Learning:** Replacing a loop of queries with a single query + in-memory aggregation is a massive win for things like histograms or memory curves.
**Action:** Always check for `for bucket in buckets: await db.execute(...)` patterns.
**Learning:** Avoid hardcoded magic numbers (e.g., `WHERE interval < 45`) in optimization filters. They make the code brittle if configuration changes.
**Action:** Dynamically calculate bounds from the configuration (e.g., `max(r[1] for r in bucket_ranges.values())`).
