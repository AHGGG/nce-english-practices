# Bolt's Journal

## 2024-05-22 - Initial Entry
**Learning:** Initialized Bolt's journal.
**Action:** Always check here for performance insights.

## 2024-05-22 - Database Indexes for Scalability
**Learning:** The `Attempt` table (practice logs) and `CoachSession` (chat logs) lacked crucial indexes for filtering by `topic`, `tense`, and `user_id`. This would cause full table scans as the dataset grows, especially for "Progress by Topic" or "History" features.
**Action:** Added `idx_attempt_topic_tense` and `idx_coach_user` to `app/models/orm.py`. Always verify model definitions include indexes for foreign keys and frequent filter columns, even if current queries are simple aggregations.
