# 08 - Migration Guide

> 迁移指南、兼容性处理

## 1. Overview

本文档描述如何从现有架构迁移到新的 Content Adapter 架构，确保平滑过渡。

## 2. Migration Strategy

### 2.1 Principles

1. **渐进式迁移** - 不一次性替换所有代码
2. **向后兼容** - 新旧代码可以共存
3. **可回滚** - 出问题可以快速回退
4. **功能对等** - 迁移后功能不减少

### 2.2 Migration Phases

```
Phase 1: 并行运行
├── 新 Renderer 与旧代码共存
├── 通过 feature flag 控制
└── 验证功能对等

Phase 2: 逐步切换
├── 默认使用新 Renderer
├── 保留旧代码作为回退
└── 收集反馈

Phase 3: 清理
├── 移除旧代码
├── 移除 feature flag
└── 更新文档
```

## 3. Phase 1 Migration Steps

### 3.1 Step 1: 添加新代码（不修改现有代码）

```bash
# 创建新目录
mkdir -p apps/web/src/components/content/{renderers,shared}

# 添加新文件
# - types.ts
# - registry.ts
# - renderers/TextContentRenderer.tsx
# - shared/SentenceBlock.tsx
# - shared/ImageBlock.tsx
# - shared/HeadingBlock.tsx
# - index.ts
```

### 3.2 Step 2: 添加 Feature Flag

```typescript
// apps/web/src/config/features.ts

export const FEATURES = {
  USE_NEW_RENDERER: false, // 默认关闭
};

// 或使用环境变量
export const FEATURES = {
  USE_NEW_RENDERER: import.meta.env.VITE_USE_NEW_RENDERER === "true",
};
```

### 3.3 Step 3: 修改 ReaderView 支持双模式

```jsx
// apps/web/src/components/reading/ReaderView.jsx

import { FEATURES } from "../../config/features";
import { rendererRegistry } from "../content";

const ReaderView = (props) => {
  const { article } = props;

  // Feature flag 控制
  if (FEATURES.USE_NEW_RENDERER) {
    const renderer = rendererRegistry.getRendererForBundle(article);
    if (renderer) {
      return (
        <div className="...">
          {/* Header */}
          {renderer.render({
            bundle: article,
            ...props,
          })}
        </div>
      );
    }
  }

  // 原有逻辑
  return <LegacyReaderView {...props} />;
};
```

### 3.4 Step 4: 验证功能对等

**测试清单**:

| 功能       | 测试方法           | 状态 |
| ---------- | ------------------ | ---- |
| EPUB 渲染  | 打开 EPUB 文章     | ⬜   |
| 词汇高亮   | 检查 COCA 词汇高亮 | ⬜   |
| 词汇点击   | 点击词汇弹出词典   | ⬜   |
| 图片渲染   | 检查图片显示       | ⬜   |
| 图片放大   | 点击图片放大       | ⬜   |
| 渐进加载   | 滚动加载更多       | ⬜   |
| 不清楚句子 | 检查标记显示       | ⬜   |
| 阅读追踪   | 检查 session 记录  | ⬜   |

## 4. Backward Compatibility

### 4.1 ContentBundle 兼容

```python
# 后端：同时输出 blocks 和 sentences

class ContentBundle(BaseModel):
    # 新：主要使用
    blocks: List[ContentBlock] = []

    # 旧：保留兼容
    sentences: List[ContentSentence] = []
```

```typescript
// 前端：优先使用 blocks

const renderContent = (bundle: ContentBundle) => {
  // 优先使用 blocks
  if (bundle.blocks && bundle.blocks.length > 0) {
    return renderBlocks(bundle.blocks);
  }

  // 回退到 sentences
  if (bundle.sentences && bundle.sentences.length > 0) {
    return renderSentences(bundle.sentences);
  }

  return null;
};
```

### 4.2 API 兼容

```python
# 统一内容协议 API
GET /api/content/catalog/{source_type}
GET /api/content/units/{source_type}/{item_id}
GET /api/content/units/{source_type}/{item_id}/with-status
GET /api/content/bundle?source_id=...
GET /api/content/asset?source_id=...&path=...
```

### 4.3 组件兼容

```tsx
// 旧组件继续可用
import MemoizedSentence from "../reading/MemoizedSentence";

// 新组件
import { SentenceBlock } from "../content/shared";

// 两者功能相同，可以逐步替换
```

## 5. Rollback Plan

### 5.1 Quick Rollback

```typescript
// 1. 关闭 feature flag
export const FEATURES = {
  USE_NEW_RENDERER: false,
};

// 2. 重新部署
```

### 5.2 Full Rollback

```bash
# 1. 回退代码
git revert <commit-hash>

# 2. 重新部署
```

## 6. Deprecation Timeline

### Phase 1 完成后

```
Week 1-2:
- Feature flag 默认关闭
- 内部测试新 Renderer

Week 3-4:
- Feature flag 默认开启
- 收集用户反馈
```

### Phase 2 完成后

```
Week 5-6:
- 移除 feature flag
- 新 Renderer 成为默认

Week 7-8:
- 标记旧代码为 @deprecated
- 更新文档
```

### Phase 3 完成后

```
Week 9+:
- 移除旧代码
- 清理 @deprecated 标记
```

## 7. Code Cleanup Checklist

### 待移除文件

```
apps/web/src/components/reading/
├── MemoizedSentence.jsx  → 替换为 SentenceBlock
├── MemoizedImage.jsx     → 替换为 ImageBlock
└── (ReaderView 中的旧渲染逻辑)
```

### 待移除代码

```typescript
// ReaderView.jsx 中的旧 renderContent 逻辑
// 在确认新 Renderer 稳定后移除
```

### 待更新文档

- [ ] AGENTS.md - 更新架构说明
- [ ] README.md - 更新开发指南
- [ ] API 文档 - 更新接口说明

## 8. Troubleshooting

### 常见问题

**Q: 新 Renderer 渲染结果与旧版不一致**

A: 检查以下几点：

1. Props 是否正确传递
2. CSS 类名是否一致
3. 事件处理是否正确

**Q: 词汇高亮不显示**

A: 检查：

1. `highlightSet` 是否正确传递
2. `showHighlights` 是否为 true
3. 词汇表是否加载成功

**Q: 性能下降**

A: 检查：

1. memo 是否正确使用
2. arePropsEqual 是否正确实现
3. 是否有不必要的重渲染

## 9. Support

如有问题，请联系：

- 查看文档：`docs/design/content-adapter/`
- 提交 Issue：GitHub Issues
- 内部沟通：相关 Slack 频道

---

_End of Migration Guide_
