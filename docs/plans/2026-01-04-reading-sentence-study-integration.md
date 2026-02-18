# Reading Mode ↔ Sentence Study 集成设计

> 日期: 2026-01-04  
> 状态: ✅ 已实现

## 问题分析

当前 **Reading Mode** (`/reading`) 和 **Sentence Study** (`/sentence-study`) 是两个完全独立的页面，存在以下脱节：

| 问题               | 影响                                                 |
| ------------------ | ---------------------------------------------------- |
| **无跨模式导航**   | 用户无法在阅读时切换到深度学习，需要手动重新选择文章 |
| **独立的文章列表** | 两个模式共享文章状态，列表显示综合进度 (Fixed)       |
| **数据不共享**     | Reading Mode 的词汇点击不计入 SM-2 复习系统          |
| **进度不互通**     | 已实现统一进度显示                                   |

## 设计目标

1. **无缝切换**: 用户可以在两种模式间自由切换，不丢失上下文
2. **统一进度**: 显示文章的综合学习状态 (已读/已学/进行中)
3. **数据整合**: 两种模式的交互数据都能驱动 SM-2 复习
4. **渐进式实现**: 分阶段交付，每阶段都有独立价值

---

## Phase 1: 跨模式导航 (P0 - Quick Win)

### 1.1 URL 参数支持

两个模式都支持通过 URL 直接打开指定文章：

```
/reading?source_id=epub:NCE-Book4:15
/sentence-study?source_id=epub:NCE-Book4:15
/sentence-study?source_id=epub:NCE-Book4:15&sentence=5  # 从第5句开始
```

### 1.2 跨模式按钮

#### Reading Mode → Sentence Study

在 `ReaderView.jsx` 的文章头部添加按钮：

```
┌─────────────────────────────────────────┐
│  ← Back   │  Chapter 15: The Universe  │
│───────────────────────────────────────│
│  [📖 Deep Study]   [Toggle Highlights] │  ← 新增按钮
│───────────────────────────────────────│
│  Article content...                    │
└─────────────────────────────────────────┘
```

点击 "📖 Deep Study" → 跳转到 `/sentence-study?source_id=xxx`

#### Sentence Study → Reading Mode

在 `COMPLETED` 视图添加按钮：

```
┌─────────────────────────────────────────┐
│  ✅ Article Complete!                   │
│───────────────────────────────────────│
│  [📚 Read Full Article]  [Back to List] │  ← 新增按钮
└─────────────────────────────────────────┘
```

点击 "📚 Read Full Article" → 跳转到 `/reading?source_id=xxx`

### Proposed Changes

#### [MODIFY] [SentenceStudy.jsx](file:///d:/Documents/GitHub/python/nce-english-practices/frontend/src/components/sentence-study/SentenceStudy.jsx)

1. 在组件挂载时解析 `window.location.search` 获取 `source_id` 和 `sentence` 参数
2. 如果有参数，跳过 BookShelf/ArticleList，直接调用 `startStudying(sourceId)`
3. 在 `COMPLETED` 视图添加 "Read Full Article" 按钮，使用 `window.location.href` 跳转

#### [MODIFY] [ReadingMode.jsx](file:///d:/Documents/GitHub/python/nce-english-practices/frontend/src/components/reading/ReadingMode.jsx)

1. 在组件挂载时解析 URL 参数
2. 如果有 `source_id`，跳过 ArticleListView，直接调用 `loadArticle(sourceId)`

#### [MODIFY] [ReaderView.jsx](file:///d:/Documents/GitHub/python/nce-english-practices/frontend/src/components/reading/ReaderView.jsx)

1. 在工具栏区域添加 "Deep Study" 按钮
2. 点击后跳转到 `/sentence-study?source_id=${article.id}`

---

## Phase 2: 统一文章库 (P1 - Medium Effort)

### 2.1 文章状态 API

新增后端端点获取文章综合状态：

```
GET /api/content/units/epub/{item_id}/with-status
Response: {
  "units": [
    {
      "source_id": "epub:NCE-Book4:15",
      "title": "The Universe",
      "reading_sessions": 3,
      "study_progress": { "current_index": 10, "total": 25 },
      "has_review_items": true,
      "status": "in_progress"  // "new" | "read" | "in_progress" | "completed"
    }
  ]
}
```

> **Status**: ✅ implemented in `app/api/routers/content.py`

### 2.2 统一文章卡片

已更新 `ArticleListView.jsx` 以显示综合状态：

- **Completed**: 绿色边框 + 绿色徽章 + 勾选图标
- **In Progress**: 黄色边框 + 黄色徽章 + 时钟图标
- **Read**: 灰色边框 + 灰色徽章 + 图书图标
- **New**: 默认样式

> **Status**: ✅ Implemented in `ArticleListView.jsx`

### Proposed Changes (Phase 2)

#### [NEW] `frontend/src/components/shared/ArticleCard.jsx`

- 统一的文章卡片组件，显示综合状态
- 提供 Read/Study 双入口按钮

#### [NEW] `app/api/routers/content.py` 新增端点

- `GET /api/content/units/{source_type}/{item_id}/with-status`: 返回内容单元综合状态

---

## Phase 3: 深度数据整合 (P2 - Future)

### 3.1 Reading Mode 词汇追踪

当用户在 Reading Mode 点击高亮词汇时：

- 记录到 `word_proficiency` 表
- 如果同一词被点击 2+ 次，自动创建 `ReviewItem`

### 3.2 学习历史共享

Sentence Study 开始前显示：

- "You read this article 3 times (last: 2 days ago)"
- 基于阅读历史调整推荐难度

---

## Verification Plan

### Automated Tests

**已有测试**（确保不破坏现有功能）：

```bash
# 后端 API 测试
uv run pytest tests/test_sentence_study_api.py -v
uv run pytest tests/test_api_content.py -v
uv run pytest tests/test_books_api.py -v
```

### Manual Browser Tests

**Phase 1 验收测试**:

1. **URL 参数 - Sentence Study**
   - 访问 `https://localhost:5173/sentence-study?source_id=epub:xxxxx:0` (用实际 source_id)
   - 验证: 应直接进入 Overview/Studying 视图，跳过 BookShelf

2. **URL 参数 - Reading Mode**
   - 访问 `https://localhost:5173/reading?source_id=epub:xxxxx:0`
   - 验证: 应直接打开该文章，跳过 ArticleListView

3. **Cross-Mode: Reading → Study**
   - 进入 Reading Mode，选择任意文章
   - 点击 "Deep Study" 按钮
   - 验证: 应跳转到 Sentence Study 的同一文章

4. **Cross-Mode: Study → Reading**
   - 进入 Sentence Study，完成一篇文章
   - 在 COMPLETED 视图点击 "Read Full Article"
   - 验证: 应跳转到 Reading Mode 显示全文

---

## Implementation Priority

| Phase | 内容                  | 工作量 | 价值     |
| ----- | --------------------- | ------ | -------- |
| **1** | URL 参数 + 跨模式按钮 | 2-3h   | ⭐⭐⭐⭐ |
| **2** | 统一文章库 + 状态 API | 4-6h   | ⭐⭐⭐   |
| **3** | 深度数据整合          | 8-12h  | ⭐⭐     |

> **建议**: 先实现 Phase 1，立即提供跨模式导航能力，后续根据使用反馈决定是否实现 Phase 2/3。
