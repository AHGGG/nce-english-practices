# Performance Report 指标文档

本文档详细说明了 `/performance` 页面各项指标的数据来源、采集依据和计算算法。

---

## 1. 基础 KPI 指标

### 1.1 词汇量 (vocab_size)

**定义**: 用户正在学习或已掌握的单词总数

**数据来源**: `word_proficiency` 表

**计算公式**:
```sql
SELECT COUNT(DISTINCT word) 
FROM word_proficiency 
WHERE status != 'new'
```

**说明**: 统计 `status` 不为 `new` 的去重单词数量。状态包括:
- `new`: 新遇到的词 (不计入)
- `learning`: 正在学习中
- `mastered`: 已掌握

---

### 1.2 掌握率 (mastery_rate)

**定义**: 已掌握单词占全部接触单词的比例

**数据来源**: `word_proficiency` 表

**计算公式**:
```
mastery_rate = COUNT(status='mastered') / COUNT(DISTINCT word)
```

**说明**: 分子为 `mastered` 状态的单词数，分母为所有接触过的单词总数。

---

### 1.3 理解力 (comprehension_score)

**定义**: 用户首次遇到单词时就理解的比例 (越高越好)

**数据来源**: `word_proficiency` 表的 `huh_count` 和 `exposure_count`

**计算公式**:
```
comprehension_score = 1 - SUM(huh_count) / SUM(exposure_count)
```

**说明**: 
- `huh_count`: 用户点击 "HUH?" 按钮的次数 (表示不理解)
- `exposure_count`: 单词出现的总次数
- 结果为 0~1 之间的小数，乘以 100 显示为百分比

---

### 1.4 学习时长 (total_study_minutes)

**定义**: 用户累计学习时间 (分钟)

**数据来源**: `attempts` 表的 `duration_seconds`

**计算公式**:
```sql
SELECT SUM(duration_seconds) / 60 FROM attempts
```

**说明**: 汇总所有练习活动 (quiz, scenario, mission) 的持续时间。

---

## 2. V2 动态指标

### 2.1 待复习词数 (due_reviews_count)

**定义**: 根据 SRS 算法，到期需要复习的笔记/单词数量

**数据来源**: `srs_schedule` 表

**计算公式**:
```sql
SELECT COUNT(*) FROM srs_schedule 
WHERE next_review_at <= NOW()
```

**说明**: 统计当前时间已超过 `next_review_at` 的记录数。

---

### 2.2 连续学习天数 (current_streak)

**定义**: 从今天往前连续学习的天数

**数据来源**: `attempts` 表 + `vocab_learning_logs` 表

**计算算法**:
```python
# 1. 获取所有有活动的日期
attempt_dates = SELECT DISTINCT DATE(created_at) FROM attempts
vocab_dates = SELECT DISTINCT DATE(created_at) FROM vocab_learning_logs
all_dates = attempt_dates ∪ vocab_dates

# 2. 从今天开始往前数连续天数
streak = 0
check_date = today
while check_date in all_dates:
    streak += 1
    check_date -= 1 day
```

**说明**: 任何一天有练习活动或查词记录都算有效学习。

---

### 2.3 阅读字数 (total_words_read) - V2 混合信号版

**定义**: 用户**真实阅读**的英文单词总数 (经过验证)

**数据来源**: `reading_sessions` 表 (新) + `vocab_learning_logs` 表 (回退)

**混合信号采集**:
| 信号 | 采集方式 | 作用 |
|------|----------|------|
| 时间比 | active_seconds / expected_seconds | 太快=扫视 |
| 顺序性 | 句子跳跃检测 | 跳过不计 |
| 活跃度 | Page Visibility API | 挂机不算 |
| 交互 | 生词点击次数 | 高置信度 |

**质量评估公式**:
```python
# 预期时间 (150 WPM)
expected_seconds = (sentences_covered * words_per_sentence) / 150 * 60
time_ratio = active_seconds / expected_seconds
jump_ratio = scroll_jump_count / sentences_covered

if has_interactions and time_ratio >= 0.5 and jump_ratio < 0.2:
    quality = "high", multiplier = 1.0
elif time_ratio >= 0.3 and jump_ratio < 0.3:
    quality = "medium", multiplier = 0.7
elif time_ratio >= 0.1:
    quality = "low", multiplier = 0.3
else:
    quality = "skimmed", multiplier = 0.0

validated_words = sequential_sentences * words_per_sentence * multiplier
```

**聚合查询**:
```sql
SELECT SUM(validated_word_count), COUNT(*) 
FROM reading_sessions 
WHERE reading_quality IN ('high', 'medium', 'low')
```

**向后兼容**: 无 `reading_sessions` 数据时自动回退到旧版 `vocab_learning_logs` 估算。


---

### 2.4 里程碑徽章 (milestones)

**词汇量里程碑**:
| 阈值 | 图标 | 名称 |
|------|------|------|
| 50 | 🌱 | Seedling |
| 100 | 🌿 | Sprout |
| 500 | 🌲 | Sapling |
| 1000 | 🌳 | Tree |
| 2000 | 🌲🌲 | Grove |
| 3000 | 🏔️ | Forest |
| 5000 | ⛰️ | Mountain |
| 10000 | 🗻 | Everest |

**连续学习里程碑**:
| 阈值 | 图标 | 名称 |
|------|------|------|
| 7天 | 🔥 | Week Warrior |
| 30天 | 💪 | Monthly Master |
| 100天 | 🏆 | Century Club |
| 365天 | 👑 | Year Champion |

**计算方式**: 实时计算，不持久化到数据库。

---

## 3. V3 游戏化指标

### 3.1 每日目标 (goals_progress)

**定义**: 用户自定义的每日学习目标及当日完成进度

**数据来源**: `user_goals` 表 + 多表查询

**目标类型与默认值**:
| 类型 | 默认值 | 说明 |
|------|--------|------|
| new_words | 10 | 今日新学单词数 |
| review_words | 20 | 今日复习单词数 |
| study_minutes | 30 | 今日学习时长 |
| reading_words | 500 | 今日阅读字数 |

**进度计算算法**:

```python
today_start = datetime.combine(today, datetime.min.time())
today_end = today_start + timedelta(days=1)

# 新学单词: 今天首次见到的词
new_words = SELECT COUNT(DISTINCT word) FROM word_proficiency
            WHERE first_seen_at >= today_start 
            AND first_seen_at < today_end

# 复习单词: 今天再次见到的词 (非首次)
review_words = SELECT COUNT(DISTINCT word) FROM word_proficiency
               WHERE last_seen_at >= today_start AND last_seen_at < today_end
               AND first_seen_at < today_start

# 学习时长
study_minutes = SELECT SUM(duration_seconds)/60 FROM attempts
                WHERE created_at >= today_start AND created_at < today_end

# 阅读字数: 今日查词的上下文句子总字数
reading_words = SUM(len(context_sentence.split())) 
                for logs where created_at in today
```

---

### 3.2 记忆曲线 (memory_curve)

**定义**: 对比用户实际记忆保持率与艾宾浩斯遗忘曲线

**数据来源**: `word_proficiency` 表

**时间桶 (Time Buckets)**: 1天, 3天, 7天, 14天, 30天

**实际曲线计算算法**:
```python
buckets = {1: [], 3: [], 7: [], 14: [], 30: []}

for word in word_proficiency where exposure_count > 1:
    days_since_first = (last_seen_at - first_seen_at).days
    
    # 记忆保持率 = 1 - (不懂次数 / 总出现次数)
    retention = 1 - (huh_count / exposure_count)
    
    # 分配到最近的时间桶
    for bucket in sorted(buckets.keys()):
        if days_since_first <= bucket:
            buckets[bucket].append(retention)
            break

# 计算每个桶的平均保持率
actual_curve = [
    {"day": d, "retention": avg(buckets[d])}
    for d in sorted(buckets.keys())
]
```

**艾宾浩斯理论曲线**:
```python
# R = e^(-t/S)，其中 S = 记忆稳定性参数 (默认 S=10)
ebbinghaus = [
    {"day": t, "retention": exp(-t / 10)}
    for t in [1, 3, 7, 14, 30]
]
```

**理论值参考**:
| 天数 | 理论保持率 |
|------|-----------|
| 1天 | 90% |
| 3天 | 74% |
| 7天 | 50% |
| 14天 | 25% |
| 30天 | 5% |

---

## 4. 其他指标

### 4.1 词汇分布 (vocabulary.distribution)

**数据来源**: `word_proficiency` 表

```sql
SELECT status, COUNT(*) FROM word_proficiency GROUP BY status
```

返回: `{new: N, learning: N, mastered: N}`

---

### 4.2 难词榜 (vocabulary.difficult_words)

**定义**: 最难掌握的单词 (按难度分数排序)

**数据来源**: `word_proficiency` 表的 `difficulty_score`

```sql
SELECT word, difficulty_score, huh_count 
FROM word_proficiency
WHERE difficulty_score > 0
ORDER BY difficulty_score DESC
LIMIT 10
```

**说明**: `difficulty_score` 由系统根据用户反馈自动计算。

---

### 4.3 活动热力图 (activity.daily_counts)

**定义**: 过去 N 天每天的活动数量

**数据来源**: `attempts` + `vocab_learning_logs`

```python
# 合并两个表的日期活动计数
attempt_counts = SELECT DATE(created_at), COUNT(*) FROM attempts
                 WHERE created_at >= cutoff GROUP BY DATE(created_at)

vocab_counts = SELECT DATE(created_at), COUNT(*) FROM vocab_learning_logs
               WHERE created_at >= cutoff GROUP BY DATE(created_at)

daily_counts = merge(attempt_counts, vocab_counts)
```

---

### 4.4 学习来源分布 (sources.distribution)

**定义**: 用户从不同渠道学习的比例

**数据来源**: `vocab_learning_logs` 表的 `source_type`

```sql
SELECT source_type, COUNT(*) FROM vocab_learning_logs GROUP BY source_type
```

**来源类型**:
- `epub`: EPUB 电子书阅读
- `rss`: RSS 文章阅读
- `dictionary`: 词典查询
- `voice`: 语音练习
- `podcast`: 播客

---

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/performance` | GET | 获取完整 dashboard 数据 |
| `/api/goals` | GET | 获取用户目标设置 |
| `/api/goals` | PUT | 更新用户目标 |
| `/api/goals/progress` | GET | 获取今日目标进度 |
