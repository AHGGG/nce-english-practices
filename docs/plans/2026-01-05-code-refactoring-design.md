# Code Refactoring Design: SentenceStudy Module

重构 SentenceStudy 模块：前端 1344 行 + 后端 1423 行 → 模块化结构。

## Problem

- `SentenceStudy.jsx` 包含 5 个视图、API 调用、状态管理，难以维护
- `sentence_study.py` 混合路由定义和业务逻辑，难以测试和复用
- API 调用模式不统一（内联 fetch vs axios client）

## Solution

适度重构：拆分文件 + 统一 API 调用 + 抽取共享逻辑。

---

## Phase 1: Frontend Refactoring

### Target Structure

```
frontend/src/components/sentence-study/
├── index.js                    # 导出入口
├── SentenceStudy.jsx           # 主容器 (~200行)
├── api.js                      # [NEW] 统一 API 调用
├── constants.js                # [NEW] VIEW_STATES, DIFFICULTY_CHOICES
├── views/
│   ├── BookShelfView.jsx       # [EXTRACT]
│   ├── ArticleListView.jsx     # [EXTRACT]
│   ├── OverviewView.jsx        # [EXTRACT]
│   ├── StudyingView.jsx        # [EXTRACT]
│   └── CompletedView.jsx       # [EXTRACT]
└── hooks/
    └── useSentenceStudy.js     # [NEW] 核心状态逻辑
```

### Key Changes

| File | Action |
|------|--------|
| `api.js` | 新建，统一所有 API 调用 |
| `constants.js` | 新建，VIEW_STATES / DIFFICULTY_CHOICES |
| `views/*.jsx` | 从主文件抽取 renderXxx 方法 |
| `useSentenceStudy.js` | 抽取状态管理逻辑 |
| `SentenceStudy.jsx` | 瘦身至 ~200 行 |

---

## Phase 2: Backend Refactoring

### Target Structure

```
app/
├── api/routers/
│   └── sentence_study.py       # [SLIM] 仅路由 (~300行)
└── services/
    └── sentence_study_service.py  # [NEW] 业务逻辑 (~800行)
```

### Responsibility Split

**Router Layer** (`sentence_study.py`):
- Pydantic models
- Endpoint definitions
- Delegate to service

**Service Layer** (`sentence_study_service.py`):
- LLM streaming logic
- Cache management (in-memory + DB)
- Collocation detection
- Review item creation

### Functions to Extract

| Original | Service Method |
|----------|---------------|
| `simplify_sentence()` LLM logic | `stream_simplification()` |
| `generate_overview()` cache+LLM | `get_or_generate_overview()` |
| `explain_word_in_context()` | `stream_word_explanation()` |
| `detect_collocations()` | `detect_collocations()` |

---

## Verification Plan

| Phase | Verification |
|-------|-------------|
| Frontend | Browser: BookShelf→Article→Overview→Study→Complete flow |
| Backend | `uv run pytest tests/test_sentence_study_api.py -v` |
| Full | E2E regression + manual spot check |

## Estimated Effort

- Frontend: ~30 min
- Backend: ~20 min
- Verification: ~10 min
