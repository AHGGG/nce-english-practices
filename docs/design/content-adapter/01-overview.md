# 01 - Architecture Overview

> 架构概述、设计目标、核心原则

## 1. Design Goals

### 1.1 Primary Goals

| 目标           | 描述                                             | 优先级 |
| -------------- | ------------------------------------------------ | ------ |
| **扩展性**     | 快速接入新内容类型（Audiobook、Comic、PDF）      | P0     |
| **复用性**     | 词汇高亮、词典查询、学习集成等能力跨内容类型共享 | P0     |
| **渐进式迁移** | 不破坏现有功能，逐步重构                         | P0     |
| **性能**       | 大量内容时的渲染性能                             | P1     |

### 1.2 Non-Goals (Explicitly Out of Scope)

- ❌ 实时协作编辑
- ❌ 内容创作/编辑功能
- ❌ 多语言内容混排（暂时只支持英文学习）

## 2. Core Philosophy

### 2.1 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│                         Content Layer                            │
│                        (Backend - Python)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   职责：                                                         │
│   ├── 从各种来源获取原始内容                                      │
│   ├── 解析为标准化的 ContentBundle                                │
│   └── 提供元数据（标题、作者、进度等）                            │
│                                                                  │
│   不负责：                                                        │
│   ├── 如何展示内容                                                │
│   └── 用户交互逻辑                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ ContentBundle (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Rendering Layer                           │
│                       (Frontend - React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   职责：                                                         │
│   ├── 根据 source_type 选择合适的 Renderer                       │
│   ├── 渲染内容并处理用户交互                                      │
│   └── 调用共享能力（词汇高亮、词典查询等）                         │
│                                                                  │
│   不负责：                                                        │
│   ├── 内容解析逻辑                                                │
│   └── 数据持久化                                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Design Patterns

| Pattern         | 应用位置                | 说明                                 |
| --------------- | ----------------------- | ------------------------------------ |
| **Strategy**    | Backend Providers       | 不同内容类型使用不同的 Provider 实现 |
| **Registry**    | ContentService          | 管理 Provider 注册表                 |
| **Strategy**    | Frontend Renderers      | 不同内容类型使用不同的 Renderer 实现 |
| **Registry**    | ContentRendererRegistry | 管理 Renderer 注册表                 |
| **Composition** | Shared Hooks            | 共享能力通过 hooks 组合到各 Renderer |

### 2.3 Key Principles

#### YAGNI (You Aren't Gonna Need It)

```
❌ 不要这样做：
   - 提前设计 OCR 坐标系统（等 Comic 需求确定再加）
   - 提前设计多语言支持（当前只做英文）
   - 提前设计离线同步（等有明确需求再加）

✅ 应该这样做：
   - 设计可扩展的接口，但只实现当前需要的
   - 预留扩展点，但不实现具体逻辑
```

#### Open/Closed Principle

```
添加新内容类型的标准流程：

1. 后端：创建新的 Provider 类
   └── 实现 BaseContentProvider 接口
   └── 在 ContentService 中注册

2. 前端：创建新的 Renderer 组件
   └── 实现 ContentRenderer 接口
   └── 在 ContentRendererRegistry 中注册

3. 不需要修改：
   └── 现有 Provider 代码
   └── 现有 Renderer 代码
   └── 核心接口定义
```

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                  ContentRendererRegistry                         │   │
│   │                                                                  │   │
│   │   getRenderer(sourceType: SourceType) → ContentRenderer          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│            ┌───────────────────────┼───────────────────────┐            │
│            ▼                       ▼                       ▼            │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐      │
│   │ TextRenderer    │   │ AudioRenderer   │   │ ComicRenderer   │      │
│   │ (epub/rss)      │   │ (podcast/book)  │   │ (future)        │      │
│   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘      │
│            │                     │                     │                │
│            └─────────────────────┼─────────────────────┘                │
│                                  │                                      │
│                                  ▼                                      │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     Shared Capabilities                          │   │
│   │                                                                  │   │
│   │   useWordInteraction()     - 词汇点击、选中                       │   │
│   │   useVocabularyHighlight() - COCA/CET 词汇高亮                    │   │
│   │   useLearningIntegration() - 复习队列、熟练度集成                  │   │
│   │   useReadingTracker()      - 阅读行为追踪                         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                              API Layer                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   GET /api/content/{source_type}/{source_id}  →  ContentBundle          │
│   GET /api/content/{source_type}/{source_id}/media/{path}  →  bytes     │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                              Backend                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      ContentService                              │   │
│   │                                                                  │   │
│   │   get_content(source_type, **params) → ContentBundle             │   │
│   │   register_provider(provider)                                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│            ┌───────────────────────┼───────────────────────┐            │
│            ▼                       ▼                       ▼            │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐      │
│   │ EpubProvider    │   │ PodcastProvider │   │ AudiobookProv.  │      │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘      │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐      │
│   │ RssProvider     │   │ PlainTextProv.  │   │ ComicProvider   │      │
│   └─────────────────┘   └─────────────────┘   └─────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4. Implementation Phases

### Phase 1: Renderer Abstraction (1-2 weeks)

**目标**: 前端引入 Renderer 抽象，解耦渲染逻辑

**范围**:

- 创建 `ContentRendererRegistry`
- 创建 `ContentRenderer` 接口
- 将现有 `ReaderView` 逻辑迁移到 `TextContentRenderer`
- 提取共享 hooks

**产出**:

- 新增文件: `apps/web/src/components/content/`
- 不修改后端

### Phase 2: Audiobook Support (2-3 weeks)

**目标**: 支持有声书内容类型

**范围**:

- 后端: 新增 `AudiobookProvider`
- 后端: `ContentBlock` 扩展音频字段
- 前端: 新增 `AudioContentRenderer`
- 前端: 字幕同步播放功能

**产出**:

- 新增 Provider
- 新增 Renderer
- 扩展 Schema

### Phase 3: Comic Support (TBD)

**目标**: 支持漫画内容类型（含 OCR）

**范围**:

- 后端: 新增 `ComicProvider`
- 后端: 新增 `InteractiveRegion` 模型（仅 Comic 使用）
- 前端: 新增 `ComicRenderer`
- 前端: OCR 文字覆盖层

**产出**:

- 新增 Provider
- 新增 Renderer
- 新增 OCR 相关模型

## 5. Success Criteria

### Phase 1 完成标准

- [ ] 现有 EPUB/RSS 阅读功能正常工作
- [ ] 新增内容类型只需添加 Renderer，不修改现有代码
- [ ] 词汇高亮、词典查询等功能可跨 Renderer 复用

### Phase 2 完成标准

- [ ] 可以播放有声书并显示同步字幕
- [ ] 字幕句子可点击查词
- [ ] 阅读进度可追踪

### Phase 3 完成标准

- [ ] 可以阅读漫画图片
- [ ] OCR 识别的文字可点击查词
- [ ] 阅读进度可追踪

---

_Next: [02-current-state.md](./02-current-state.md) - 现有系统分析_
