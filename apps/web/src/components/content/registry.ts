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
