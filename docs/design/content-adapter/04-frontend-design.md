# 04 - Frontend Design Overview

> 前端架构概述、目录结构

## 1. New Directory Structure

```
apps/web/src/components/
├── content/                          # 新增：内容渲染抽象层
│   ├── index.ts                      # 导出
│   ├── types.ts                      # 类型定义
│   ├── registry.ts                   # Renderer 注册表
│   ├── renderers/                    # 各类型 Renderer
│   │   ├── TextContentRenderer.tsx   # 文本内容 (epub/rss)
│   │   ├── AudioContentRenderer.tsx  # 音频内容 (podcast/audiobook)
│   │   └── ComicContentRenderer.tsx  # 漫画内容 (future)
│   └── shared/                       # 共享组件
│       ├── SentenceBlock.tsx         # 句子渲染（从 MemoizedSentence 提取）
│       ├── ImageBlock.tsx            # 图片渲染（从 MemoizedImage 提取）
│       └── HeadingBlock.tsx          # 标题渲染
│
├── reading/                          # 现有：保持不变，逐步迁移
│   ├── ReadingMode.jsx
│   ├── ReaderView.jsx               # 将调用 TextContentRenderer
│   └── ...
│
└── podcast/                          # 现有：保持不变，逐步迁移
    └── ...
```

## 2. Core Abstractions

### 2.1 ContentRenderer Interface

```typescript
// apps/web/src/components/content/types.ts

import { ReactNode } from "react";

/**
 * 内容渲染器接口
 * 每种内容类型实现此接口
 */
export interface ContentRenderer {
  /**
   * 判断是否可以渲染该内容
   */
  canRender(bundle: ContentBundle): boolean;

  /**
   * 渲染内容
   */
  render(props: ContentRendererProps): ReactNode;
}

export interface ContentRendererProps {
  /** 内容数据 */
  bundle: ContentBundle;

  /** 词汇高亮集合 */
  highlightSet?: Set<string>;

  /** 学习高亮集合（查过的词） */
  studyHighlightSet?: Set<string>;

  /** 是否显示高亮 */
  showHighlights?: boolean;

  /** 词汇点击回调 */
  onWordClick?: (word: string, sentence: string) => void;

  /** 句子点击回调 */
  onSentenceClick?: (sentence: string, meta?: any) => void;

  /** 图片点击回调 */
  onImageClick?: (src: string, alt?: string, caption?: string) => void;

  /** 阅读追踪器 */
  tracker?: ReadingTrackerRef;
}
```

### 2.2 ContentRendererRegistry

```typescript
// apps/web/src/components/content/registry.ts

import { SourceType } from "@nce/api";
import { ContentRenderer } from "./types";

/**
 * 内容渲染器注册表
 * 根据 source_type 获取对应的 Renderer
 */
class ContentRendererRegistry {
  private renderers: Map<SourceType, ContentRenderer> = new Map();

  /**
   * 注册 Renderer
   */
  register(sourceType: SourceType, renderer: ContentRenderer): void {
    this.renderers.set(sourceType, renderer);
  }

  /**
   * 获取 Renderer
   */
  getRenderer(sourceType: SourceType): ContentRenderer | null {
    return this.renderers.get(sourceType) || null;
  }

  /**
   * 获取所有支持的类型
   */
  getSupportedTypes(): SourceType[] {
    return Array.from(this.renderers.keys());
  }
}

// 单例
export const rendererRegistry = new ContentRendererRegistry();
```

## 3. Shared Hooks

### 3.1 Hook 职责划分

| Hook                     | 职责                  | 位置                         |
| ------------------------ | --------------------- | ---------------------------- |
| `useWordInteraction`     | 词汇点击、选中、查词  | `packages/shared/src/hooks/` |
| `useVocabularyHighlight` | COCA/CET 词汇高亮计算 | `packages/shared/src/hooks/` |
| `useLearningIntegration` | 复习队列、熟练度集成  | `packages/shared/src/hooks/` |
| `useReadingTracker`      | 阅读行为追踪          | 已存在，保持不变             |
| `useAudioSync`           | 音频字幕同步          | 新增 (Phase 2)               |

### 3.2 Hook 依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Components                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   TextContentRenderer    AudioContentRenderer    Comic...    │
│          │                      │                            │
│          └──────────┬───────────┘                            │
│                     │                                        │
│                     ▼                                        │
├─────────────────────────────────────────────────────────────┤
│                    Shared Hooks                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   useWordInteraction()                                       │
│   ├── 处理词汇点击事件                                        │
│   ├── 调用 useWordExplainer() 获取解释                       │
│   └── 更新 studyHighlightSet                                 │
│                                                              │
│   useVocabularyHighlight(sentences, options)                 │
│   ├── 根据 COCA/CET 词表计算高亮词汇                          │
│   └── 返回 highlightSet                                      │
│                                                              │
│   useLearningIntegration()                                   │
│   ├── 标记已知词汇                                            │
│   ├── 添加到复习队列                                          │
│   └── 更新熟练度                                              │
│                                                              │
│   useReadingTracker() (existing)                             │
│   ├── 追踪阅读时间                                            │
│   ├── 追踪句子可见性                                          │
│   └── 追踪词汇点击                                            │
│                                                              │
│   useAudioSync() (Phase 2)                                   │
│   ├── 音频播放控制                                            │
│   ├── 字幕同步高亮                                            │
│   └── 点击字幕跳转                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 4. Migration Strategy

### 4.1 Phase 1: 提取共享组件

```
Step 1: 创建 content/ 目录结构
Step 2: 提取 MemoizedSentence → SentenceBlock
Step 3: 提取 MemoizedImage → ImageBlock
Step 4: 创建 TextContentRenderer（包装现有逻辑）
Step 5: ReaderView 调用 TextContentRenderer
```

### 4.2 Phase 2: 添加 AudioContentRenderer

```
Step 1: 创建 useAudioSync hook
Step 2: 创建 AudioContentRenderer
Step 3: 注册到 Registry
Step 4: 有声书页面使用新 Renderer
```

### 4.3 Backward Compatibility

```typescript
// ReaderView.jsx 迁移期间的兼容代码

const ReaderView = (props) => {
  const { article } = props;

  // 获取对应的 Renderer
  const renderer = rendererRegistry.getRenderer(article.source_type);

  if (renderer) {
    // 新架构：使用 Renderer
    return renderer.render({
      bundle: article,
      ...props
    });
  }

  // 回退：使用原有逻辑
  return <LegacyReaderView {...props} />;
};
```

## 5. File List

详细设计见以下文档：

| 文档                                                   | 内容                |
| ------------------------------------------------------ | ------------------- |
| [04a-types.md](./04a-types.md)                         | TypeScript 类型定义 |
| [04b-registry.md](./04b-registry.md)                   | Registry 实现       |
| [04c-shared-components.md](./04c-shared-components.md) | 共享组件设计        |
| [04d-shared-hooks.md](./04d-shared-hooks.md)           | 共享 Hooks 设计     |

---

_Next: [04a-types.md](./04a-types.md) - TypeScript 类型定义_
