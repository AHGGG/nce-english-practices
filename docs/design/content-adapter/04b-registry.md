# 04b - Renderer Registry

> Registry 实现

## 1. Registry Implementation

```typescript
// apps/web/src/components/content/registry.ts

import { SourceType, ContentRenderer, ContentBundle } from "./types";

/**
 * 内容渲染器注册表
 *
 * 使用方式：
 * 1. 在应用启动时注册所有 Renderer
 * 2. 根据 source_type 获取对应的 Renderer
 * 3. 调用 Renderer.render() 渲染内容
 */
class ContentRendererRegistry {
  private renderers: Map<SourceType, ContentRenderer> = new Map();
  private fallbackRenderer: ContentRenderer | null = null;

  /**
   * 注册 Renderer
   *
   * @param sourceType - 内容类型
   * @param renderer - 渲染器实例
   */
  register(sourceType: SourceType, renderer: ContentRenderer): void {
    if (this.renderers.has(sourceType)) {
      console.warn(
        `[ContentRendererRegistry] Overwriting renderer for ${sourceType}`,
      );
    }
    this.renderers.set(sourceType, renderer);
  }

  /**
   * 批量注册
   *
   * @param entries - [sourceType, renderer] 数组
   */
  registerAll(entries: [SourceType, ContentRenderer][]): void {
    entries.forEach(([type, renderer]) => this.register(type, renderer));
  }

  /**
   * 设置回退 Renderer（当找不到对应类型时使用）
   */
  setFallback(renderer: ContentRenderer): void {
    this.fallbackRenderer = renderer;
  }

  /**
   * 获取 Renderer
   *
   * @param sourceType - 内容类型
   * @returns Renderer 或 null
   */
  getRenderer(sourceType: SourceType): ContentRenderer | null {
    return this.renderers.get(sourceType) || this.fallbackRenderer;
  }

  /**
   * 根据 ContentBundle 自动选择 Renderer
   *
   * @param bundle - 内容数据
   * @returns Renderer 或 null
   */
  getRendererForBundle(bundle: ContentBundle): ContentRenderer | null {
    // 首先尝试精确匹配
    const exactMatch = this.renderers.get(bundle.source_type);
    if (exactMatch && exactMatch.canRender(bundle)) {
      return exactMatch;
    }

    // 遍历所有 Renderer，找到第一个可以渲染的
    for (const renderer of this.renderers.values()) {
      if (renderer.canRender(bundle)) {
        return renderer;
      }
    }

    // 使用回退
    if (this.fallbackRenderer?.canRender(bundle)) {
      return this.fallbackRenderer;
    }

    return null;
  }

  /**
   * 获取所有支持的类型
   */
  getSupportedTypes(): SourceType[] {
    return Array.from(this.renderers.keys());
  }

  /**
   * 检查是否支持某类型
   */
  isSupported(sourceType: SourceType): boolean {
    return this.renderers.has(sourceType) || this.fallbackRenderer !== null;
  }

  /**
   * 清空所有注册（用于测试）
   */
  clear(): void {
    this.renderers.clear();
    this.fallbackRenderer = null;
  }
}

// 导出单例
export const rendererRegistry = new ContentRendererRegistry();
```

## 2. Registry Initialization

```typescript
// apps/web/src/components/content/index.ts

import { rendererRegistry } from "./registry";
import { TextContentRenderer } from "./renderers/TextContentRenderer";
import { AudioContentRenderer } from "./renderers/AudioContentRenderer";
// import { ComicContentRenderer } from './renderers/ComicContentRenderer'; // Phase 3

/**
 * 初始化所有 Renderer
 * 在应用启动时调用一次
 */
export function initializeRenderers(): void {
  // Text-based content (epub, rss, plain_text)
  const textRenderer = new TextContentRenderer();
  rendererRegistry.register("epub", textRenderer);
  rendererRegistry.register("rss", textRenderer);
  rendererRegistry.register("plain_text", textRenderer);

  // Audio content (podcast, audiobook)
  const audioRenderer = new AudioContentRenderer();
  rendererRegistry.register("podcast", audioRenderer);
  rendererRegistry.register("audiobook", audioRenderer);

  // Comic content (Phase 3)
  // const comicRenderer = new ComicContentRenderer();
  // rendererRegistry.register('comic', comicRenderer);

  // Set text renderer as fallback
  rendererRegistry.setFallback(textRenderer);

  console.log(
    "[ContentRenderer] Initialized with types:",
    rendererRegistry.getSupportedTypes(),
  );
}

// Re-export
export { rendererRegistry } from "./registry";
export * from "./types";
```

## 3. Usage in App Entry

```typescript
// apps/web/src/main.tsx (or App.tsx)

import { initializeRenderers } from "./components/content";

// Initialize renderers before rendering app
initializeRenderers();

// ... rest of app initialization
```

## 4. Usage in Components

```tsx
// apps/web/src/components/reading/ReaderView.tsx

import { rendererRegistry } from "../content";
import type { ContentBundle, ContentRendererProps } from "../content/types";

interface ReaderViewProps {
  article: ContentBundle;
  // ... other props
}

export function ReaderView({ article, ...props }: ReaderViewProps) {
  // 获取对应的 Renderer
  const renderer = rendererRegistry.getRendererForBundle(article);

  if (!renderer) {
    return (
      <div className="text-red-500">
        Unsupported content type: {article.source_type}
      </div>
    );
  }

  // 构建 Renderer props
  const rendererProps: ContentRendererProps = {
    bundle: article,
    highlightSet: article.highlightSet,
    studyHighlightSet: article.studyHighlightSet,
    showHighlights: props.showHighlights,
    onWordClick: props.onWordClick,
    onSentenceClick: props.onSentenceClick,
    onImageClick: props.onImageClick,
    tracker: props.trackerRef?.current,
    visibleCount: props.visibleCount,
    metadata: article.metadata,
  };

  // 渲染
  return <>{renderer.render(rendererProps)}</>;
}
```

## 5. Testing

```typescript
// apps/web/src/components/content/__tests__/registry.test.ts

import { ContentRendererRegistry } from "../registry";
import { ContentRenderer, ContentBundle } from "../types";

describe("ContentRendererRegistry", () => {
  let registry: ContentRendererRegistry;

  beforeEach(() => {
    registry = new ContentRendererRegistry();
  });

  it("should register and retrieve renderer", () => {
    const mockRenderer: ContentRenderer = {
      canRender: () => true,
      render: () => null,
    };

    registry.register("epub", mockRenderer);

    expect(registry.getRenderer("epub")).toBe(mockRenderer);
    expect(registry.isSupported("epub")).toBe(true);
  });

  it("should return null for unregistered type", () => {
    expect(registry.getRenderer("comic")).toBeNull();
    expect(registry.isSupported("comic")).toBe(false);
  });

  it("should use fallback renderer", () => {
    const fallback: ContentRenderer = {
      canRender: () => true,
      render: () => null,
    };

    registry.setFallback(fallback);

    expect(registry.getRenderer("unknown" as any)).toBe(fallback);
  });

  it("should find renderer by canRender", () => {
    const epubRenderer: ContentRenderer = {
      canRender: (b) => b.source_type === "epub",
      render: () => null,
    };

    registry.register("epub", epubRenderer);

    const bundle: ContentBundle = {
      id: "test",
      source_type: "epub",
      title: "Test",
      blocks: [],
    };

    expect(registry.getRendererForBundle(bundle)).toBe(epubRenderer);
  });
});
```

---

_Next: [04c-shared-components.md](./04c-shared-components.md) - 共享组件设计_
