# 复习系统设计文档

> 日期: 2026-01-03  
> 状态: 已通过评审

## 概述

设计一个基于 SM-2 算法的间隔重复复习系统，用于巩固 Sentence Study 模式中学习的内容。

## 核心设计决策

| 决策点 | 选择 | 理由 |
|-------|------|------|
| 目标用户 | 日常学习者优先，兼顾备考 | 覆盖主流场景 |
| 复习单位 | 句子（带语境） | 词汇不能脱离语境 |
| 交互方式 | 被动回忆（翻卡） | 用户负担最小 |
| 评分选项 | 3 个按钮 | 平衡简洁与精度 |
| 算法 | SM-2 | 成熟可靠 |

---

## 1. 复习对象

### 进入复习队列的条件

| 学习时的行为 | 是否复习 |
|-------------|---------|
| 点击 "Unclear" | ✅ 是 |
| 点击 "Clear"，但查过词/短语 | ✅ 是 |
| 点击 "Clear"，无任何交互 | ❌ 否 |

### 复习时展示内容

- 句子原文
- 高亮用户曾查过的词/短语
- 小标签显示来源文章和困难类型

---

## 2. SM-2 调度算法

### 核心参数

| 参数 | 说明 | 初始值 |
|-----|------|-------|
| Easiness Factor (EF) | 难度因子 | 2.5 |
| Interval | 复习间隔（天） | 1 |
| Repetition | 连续成功次数 | 0 |

### 评分映射

| 用户操作 | Quality |
|---------|---------|
| 🔴 忘了 | 1 |
| ✅ 想起来了 | 3 |
| ⚡ 太简单 | 5 |

### 间隔计算

**失败 (Q < 3)**：
- Repetition = 0
- Interval = 1 天

**成功 (Q ≥ 3)**：
- 第 1 次：Interval = 1 天
- 第 2 次：Interval = 6 天
- 第 n 次：Interval = 上次间隔 × EF

### EF 调整公式

```
新 EF = EF + (0.1 - (5 - Q) × (0.08 + (5 - Q) × 0.02))
新 EF = max(1.3, 新 EF)
```

---

## 3. 记忆曲线

### 双曲线对比

**标准 Ebbinghaus 曲线**：
```
R(t) = e^(-t/S)   // S = 稳定性常数，默认 10
```

**用户实际曲线**：
- 在 1/3/7/14/30 天各时间点统计
- 保留率 = 成功回忆数 / 总复习数
- 成功 = "想起来了" 或 "太简单"

### 可视化

- X 轴：自首次学习的天数
- Y 轴：保留率 (0% - 100%)
- 蓝线：理论曲线
- 绿线：实际曲线

---

## 4. 数据模型

### ReviewItem（复习项）

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | int | 主键 |
| user_id | string | 用户标识 |
| source_id | string | 文章来源 |
| sentence_index | int | 句子索引 |
| sentence_text | string | 句子原文 |
| highlighted_items | json | 查过的词/短语 |
| difficulty_type | string | 困难类型 |
| easiness_factor | float | EF 值 |
| interval_days | float | 当前间隔 |
| repetition | int | 连续成功次数 |
| next_review_at | datetime | 下次复习时间 |
| last_reviewed_at | datetime | 上次复习时间 |
| created_at | datetime | 首次学习时间 |

### ReviewLog（复习记录）

| 字段 | 类型 | 说明 |
|-----|------|------|
| id | int | 主键 |
| review_item_id | int | 关联复习项 |
| quality | int | 评分 (1/3/5) |
| interval_at_review | float | 复习时的间隔 |
| reviewed_at | datetime | 复习时间 |

---

## 5. API 设计

### 获取复习队列

```
GET /api/review/queue
Response: { items: ReviewItem[], count: int }
```

### 提交复习结果

```
POST /api/review/complete
Body: { item_id: int, quality: int }
Response: { next_review_at, new_interval, new_ef }
```

### 创建复习项

```
POST /api/review/create
Body: { source_id, sentence_index, sentence_text, highlighted_items, difficulty_type }
```

### 获取记忆曲线

```
GET /api/review/memory-curve
Response: { theoretical: [...], actual: [...] }
```

---

## 6. 前端 UI

### 复习页面布局

```
┌─────────────────────────────────────┐
│  Review Queue                    🔄  │
├─────────────────────────────────────┤
│  📖 Climate Today · 🏷️ vocab        │  ← 小标签
│                                     │
│  "The unprecedented surge in        │
│   climate awareness has led to      │
│   significant policy changes."      │
│                                     │
├─────────────────────────────────────┤
│  ┌──────┐  ┌──────────┐  ┌───────┐  │
│  │ 忘了  │  │ 想起来了  │  │太简单 │  │
│  └──────┘  └──────────┘  └───────┘  │
└─────────────────────────────────────┘
```

### 空状态

```
┌─────────────────────────────────────┐
│              ✅                      │
│        暂无待复习内容                 │
│                                     │
│       继续学习新内容吧！              │
└─────────────────────────────────────┘
```

---

## 实现优先级

1. **P0**: 数据模型 + 创建复习项逻辑
2. **P0**: 复习队列 API + SM-2 算法
3. **P1**: 复习页面 UI
4. **P2**: 记忆曲线统计与可视化
