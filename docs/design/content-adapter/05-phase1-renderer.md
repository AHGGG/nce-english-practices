# 05 - Phase 1: Renderer Abstraction

> Phase 1 实现计划 - Renderer 抽象

## 1. Overview

| 项目         | 内容                                 |
| ------------ | ------------------------------------ |
| **目标**     | 前端引入 Renderer 抽象，解耦渲染逻辑 |
| **预计周期** | 1-2 周                               |
| **后端改动** | 无                                   |
| **风险**     | 低（纯前端重构，可逐步迁移）         |

## 2. Deliverables

### 2.1 新增文件

```
apps/web/src/components/content/
├── index.ts                          # 导出 + 初始化
├── types.ts                          # 类型定义
├── registry.ts                       # Renderer 注册表
├── renderers/
│   └── TextContentRenderer.tsx       # 文本内容渲染器
└── shared/
    ├── index.ts
    ├── SentenceBlock.tsx             # 从 MemoizedSentence 提取
    ├── ImageBlock.tsx                # 从 MemoizedImage 提取
    └── HeadingBlock.tsx              # 新建
```

### 2.2 修改文件

```
apps/web/src/
├── main.tsx                          # 添加 initializeRenderers()
└── components/reading/
    └── ReaderView.jsx                # 调用 TextContentRenderer
```

### 2.3 新增 Hooks

```
packages/shared/src/hooks/
├── useWordInteraction.ts             # 新建
├── useVocabularyHighlight.ts         # 新建
├── useLearningIntegration.ts         # 新建
└── index.ts                          # 更新导出
```

## 3. Implementation Steps

### Step 1: 创建目录结构和类型定义

**文件**: `apps/web/src/components/content/types.ts`

**内容**: 见 [04a-types.md](./04a-types.md)

**验收标准**:

- [ ] TypeScript 编译通过
- [ ] 类型与后端 Schema 对齐

---

### Step 2: 创建 Registry

**文件**: `apps/web/src/components/content/registry.ts`

**内容**: 见 [04b-registry.md](./04b-registry.md)

**验收标准**:

- [ ] 单元测试通过
- [ ] 支持注册、获取、回退

---

### Step 3: 提取共享组件

**文件**:

- `apps/web/src/components/content/shared/SentenceBlock.tsx`
- `apps/web/src/components/content/shared/ImageBlock.tsx`
- `apps/web/src/components/content/shared/HeadingBlock.tsx`

**来源**:

- `SentenceBlock` ← `MemoizedSentence.jsx` (复制 + TypeScript 化)
- `ImageBlock` ← `MemoizedImage.jsx` (复制 + TypeScript 化)
- `HeadingBlock` ← 新建

**内容**: 见 [04c-shared-components.md](./04c-shared-components.md)

**验收标准**:

- [ ] 组件功能与原组件一致
- [ ] Props 类型完整
- [ ] 性能优化保留（memo, arePropsEqual）

---

### Step 4: 创建 TextContentRenderer

**文件**: `apps/web/src/components/content/renderers/TextContentRenderer.tsx`

```tsx
// apps/web/src/components/content/renderers/TextContentRenderer.tsx

import React, { useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type {
  ContentRenderer,
  ContentRendererProps,
  ContentBundle,
} from "../types";
import { SentenceBlock, ImageBlock, HeadingBlock } from "../shared";

const BATCH_SIZE = 20;

/**
 * 文本内容渲染器
 *
 * 支持类型: epub, rss, plain_text
 *
 * 功能:
 * - Block-based 渲染 (heading, paragraph, image, subtitle)
 * - 渐进加载
 * - 词汇高亮
 * - 事件委托
 */
export class TextContentRenderer implements ContentRenderer {
  readonly name = "TextContentRenderer";

  canRender(bundle: ContentBundle): boolean {
    return ["epub", "rss", "plain_text"].includes(bundle.source_type);
  }

  render(props: ContentRendererProps): React.ReactNode {
    return <TextContentRendererComponent {...props} />;
  }
}

// 内部组件
function TextContentRendererComponent({
  bundle,
  highlightSet,
  studyHighlightSet,
  knownWords,
  showHighlights = true,
  collocations = [],
  unclearSentenceMap = {},
  onWordClick,
  onSentenceClick,
  onImageClick,
  tracker,
  visibleCount: initialVisibleCount,
  metadata,
}: ContentRendererProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = React.useState(
    initialVisibleCount || BATCH_SIZE,
  );

  // 计算总内容数
  const totalContentCount = React.useMemo(() => {
    return bundle.blocks.reduce((acc, block) => {
      if (block.type === "paragraph") {
        return acc + (block.sentences?.length || 0);
      }
      return acc + 1;
    }, 0);
  }, [bundle.blocks]);

  // 渐进加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + BATCH_SIZE, totalContentCount),
          );
        }
      },
      { rootMargin: "200px" },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [totalContentCount]);

  // 句子可见性追踪
  useEffect(() => {
    if (!tracker) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = (entry.target as HTMLElement).dataset.sentenceIdx;
            if (idx) {
              tracker.onSentenceView(parseInt(idx, 10));
            }
          }
        });
      },
      { rootMargin: "0px", threshold: 0.5 },
    );

    const sentenceEls = document.querySelectorAll("[data-sentence-idx]");
    sentenceEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [totalContentCount, visibleCount, tracker]);

  // 事件委托处理点击
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // 检查不清楚句子点击
      let el: HTMLElement | null = target;
      while (el && el !== e.currentTarget) {
        if (el.dataset?.unclearSentence === "true") {
          if (!target.dataset?.word) {
            const sentenceText = el.dataset.sentenceText;
            const unclearChoice = el.dataset.unclearChoice;
            if (sentenceText && onSentenceClick) {
              onSentenceClick(sentenceText, { unclear_choice: unclearChoice });
            }
            return;
          }
          break;
        }
        el = el.parentElement;
      }

      // 词汇点击
      const word = target.dataset?.word;
      const sentence = target.dataset?.sentence;

      if (!word) return;

      const cleanWord = word.toLowerCase();
      if (cleanWord.length < 2) return;

      onWordClick?.(cleanWord, sentence || "");
      tracker?.onWordClick();
    },
    [onWordClick, onSentenceClick, tracker],
  );

  // 构建图片 URL
  const buildImageUrl = useCallback(
    (imagePath: string) => {
      return `/api/content/asset?source_id=${encodeURIComponent(bundle.id)}&path=${encodeURIComponent(imagePath)}`;
    },
    [bundle.id],
  );

  // 渲染内容
  const renderBlocks = () => {
    let globalSentenceIndex = 0;

    return bundle.blocks.map((block, blockIdx) => {
      switch (block.type) {
        case "heading":
          return (
            <HeadingBlock
              key={`h-${blockIdx}`}
              text={block.text || ""}
              level={block.level || 2}
            />
          );

        case "image":
          return (
            <ImageBlock
              key={`i-${blockIdx}`}
              src={buildImageUrl(block.image_path || "")}
              alt={block.alt}
              caption={block.caption}
              onImageClick={onImageClick}
            />
          );

        case "paragraph": {
          const startIdx = globalSentenceIndex;
          globalSentenceIndex += block.sentences?.length || 0;

          return (
            <div key={`p-${blockIdx}`} className="mb-4">
              {block.sentences?.map((sentence, sentIdx) => {
                const globalIdx = startIdx + sentIdx;
                return (
                  <span key={`s-${globalIdx}`} data-sentence-idx={globalIdx}>
                    <SentenceBlock
                      text={sentence}
                      highlightSet={highlightSet}
                      studyHighlightSet={studyHighlightSet}
                      knownWords={knownWords}
                      showHighlights={showHighlights}
                      collocations={collocations.filter(
                        (c) => c.start_word_idx >= 0, // TODO: 按句子过滤
                      )}
                      unclearInfo={unclearSentenceMap[globalIdx]}
                    />{" "}
                  </span>
                );
              })}
            </div>
          );
        }

        case "subtitle":
          return (
            <div
              key={`sub-${blockIdx}`}
              className="text-lg italic text-text-secondary mb-4 font-serif"
            >
              {block.text}
            </div>
          );

        default:
          return null;
      }
    });
  };

  return (
    <div
      className="prose prose-invert prose-lg max-w-none font-serif md:text-xl leading-loose text-text-primary"
      style={{ contain: "content" }}
      onClick={handleClick}
    >
      {renderBlocks()}

      {/* 渐进加载 sentinel */}
      {visibleCount < totalContentCount && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-4 text-text-muted"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="ml-2 text-xs font-mono">Loading more...</span>
        </div>
      )}
    </div>
  );
}

export default TextContentRenderer;
```

**验收标准**:

- [ ] 渲染结果与原 ReaderView 一致
- [ ] 词汇高亮正常
- [ ] 渐进加载正常
- [ ] 事件委托正常

---

### Step 5: 创建初始化入口

**文件**: `apps/web/src/components/content/index.ts`

```typescript
import { rendererRegistry } from "./registry";
import { TextContentRenderer } from "./renderers/TextContentRenderer";

export function initializeRenderers(): void {
  const textRenderer = new TextContentRenderer();

  rendererRegistry.register("epub", textRenderer);
  rendererRegistry.register("rss", textRenderer);
  rendererRegistry.register("plain_text", textRenderer);
  rendererRegistry.setFallback(textRenderer);

  console.log(
    "[ContentRenderer] Initialized:",
    rendererRegistry.getSupportedTypes(),
  );
}

export { rendererRegistry } from "./registry";
export * from "./types";
```

---

### Step 6: 修改 ReaderView 使用 Renderer

**文件**: `apps/web/src/components/reading/ReaderView.jsx`

**修改内容**:

```jsx
// 在文件顶部添加
import { rendererRegistry } from "../content";

// 修改 renderContent 函数
const renderContent = () => {
  // 尝试使用新的 Renderer
  const renderer = rendererRegistry.getRendererForBundle(article);

  if (renderer) {
    return renderer.render({
      bundle: article,
      highlightSet: article.highlightSet,
      studyHighlightSet: article.studyHighlightSet,
      showHighlights,
      onWordClick,
      onSentenceClick,
      onImageClick,
      tracker: trackerRef?.current,
      visibleCount,
      metadata: article.metadata,
    });
  }

  // 回退到原有逻辑（逐步移除）
  // ... 原有代码
};
```

---

### Step 7: 在 main.tsx 初始化

**文件**: `apps/web/src/main.tsx`

```typescript
import { initializeRenderers } from "./components/content";

// 在 ReactDOM.render 之前
initializeRenderers();
```

---

### Step 8: 创建共享 Hooks

**文件**:

- `packages/shared/src/hooks/useWordInteraction.ts`
- `packages/shared/src/hooks/useVocabularyHighlight.ts`
- `packages/shared/src/hooks/useLearningIntegration.ts`

**内容**: 见 [04d-shared-hooks.md](./04d-shared-hooks.md)

**验收标准**:

- [ ] TypeScript 编译通过
- [ ] 单元测试通过

## 4. Testing Checklist

### 功能测试

- [ ] EPUB 文章正常渲染
- [ ] 词汇高亮正常显示
- [ ] 词汇点击弹出词典
- [ ] 图片懒加载正常
- [ ] 图片点击放大正常
- [ ] 渐进加载正常
- [ ] 不清楚句子标记正常
- [ ] 阅读追踪正常

### 性能测试

- [ ] 长文章（100+ 句子）渲染流畅
- [ ] 滚动无卡顿
- [ ] 内存无泄漏

### 回归测试

- [ ] Sentence Study 功能正常
- [ ] Reading Mode 所有功能正常

## 5. Rollback Plan

如果出现问题，可以快速回滚：

1. 在 `ReaderView.jsx` 中移除 Renderer 调用
2. 恢复原有 `renderContent` 逻辑
3. 移除 `initializeRenderers()` 调用

## 6. Success Criteria

- [ ] 所有现有功能正常工作
- [ ] 代码通过 CI 检查
- [ ] 无性能回退
- [ ] 新增内容类型只需添加 Renderer

---

_Next: [06-phase2-audiobook.md](./06-phase2-audiobook.md) - Phase 2 有声书支持_
