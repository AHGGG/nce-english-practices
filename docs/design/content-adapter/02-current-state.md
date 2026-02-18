# 02 - Current State Analysis

> 现有系统分析、代码位置、数据流

## 1. File Locations Quick Reference

### 1.1 Backend (Python)

| 组件                   | 路径                                                    | 说明             |
| ---------------------- | ------------------------------------------------------- | ---------------- |
| **Base Provider**      | `app/services/content_providers/base.py`                | 抽象基类         |
| **EPUB Provider**      | `app/services/content_providers/epub_provider.py`       | EPUB 解析        |
| **RSS Provider**       | `app/services/content_providers/rss_provider.py`        | RSS 订阅         |
| **Podcast Provider**   | `app/services/content_providers/podcast_provider.py`    | 播客（继承 RSS） |
| **PlainText Provider** | `app/services/content_providers/plain_text_provider.py` | 纯文本           |
| **Content Service**    | `app/services/content_service.py`                       | Registry/Factory |
| **Content Schemas**    | `app/models/content_schemas.py`                         | Pydantic 模型    |
| **API Routes**         | `app/api/routers/content.py`                            | REST API         |

### 1.2 Frontend (React)

| 组件                  | 路径                                                    | 说明     |
| --------------------- | ------------------------------------------------------- | -------- |
| **ReadingMode**       | `apps/web/src/components/reading/ReadingMode.jsx`       | 主容器   |
| **ReaderView**        | `apps/web/src/components/reading/ReaderView.jsx`        | 文章渲染 |
| **MemoizedSentence**  | `apps/web/src/components/reading/MemoizedSentence.jsx`  | 句子渲染 |
| **MemoizedImage**     | `apps/web/src/components/reading/MemoizedImage.jsx`     | 图片渲染 |
| **WordInspector**     | `apps/web/src/components/reading/WordInspector.jsx`     | 词典面板 |
| **SentenceInspector** | `apps/web/src/components/reading/SentenceInspector.jsx` | 句子解释 |
| **Constants**         | `apps/web/src/components/reading/constants.js`          | 常量定义 |

### 1.3 Shared Packages

| 组件                     | 路径                                                | 说明         |
| ------------------------ | --------------------------------------------------- | ------------ |
| **useArticleReader**     | `packages/shared/src/hooks/useArticleReader.ts`     | 文章数据获取 |
| **useReadingTracker**    | `packages/shared/src/hooks/useReadingTracker.ts`    | 阅读追踪     |
| **useWordExplainer**     | `packages/shared/src/hooks/useWordExplainer.ts`     | 词汇解释     |
| **useSentenceExplainer** | `packages/shared/src/hooks/useSentenceExplainer.ts` | 句子解释     |
| **API Client**           | `packages/api/src/endpoints/reading.ts`             | API 调用     |

## 2. Current Data Models

### 2.1 SourceType Enum

```python
# app/models/content_schemas.py

class SourceType(str, Enum):
    EPUB = "epub"
    PODCAST = "podcast"
    RSS = "rss"
    PLAIN_TEXT = "plain_text"
```

### 2.2 BlockType Enum

```python
class BlockType(str, Enum):
    PARAGRAPH = "paragraph"
    IMAGE = "image"
    HEADING = "heading"
    SUBTITLE = "subtitle"
```

### 2.3 ContentBlock Model

```python
class ContentBlock(BaseModel):
    """
    A single content block in an article.
    Preserves DOM order for accurate rendering.
    """
    type: BlockType

    # For PARAGRAPH/HEADING/SUBTITLE
    text: Optional[str] = None
    sentences: List[str] = []  # Paragraph split into sentences

    # For IMAGE
    image_path: Optional[str] = None
    alt: Optional[str] = None
    caption: Optional[str] = None

    # For HEADING (1=h1, 2=h2, etc.)
    level: Optional[int] = None
```

### 2.4 ContentBundle Model (Core Output)

```python
class ContentBundle(BaseModel):
    """
    统一内容包 - 所有 Content Provider 的标准输出格式。
    """
    id: str                              # 唯一 ID (e.g., "epub:filename:0")
    source_type: SourceType              # 来源类型
    title: str                           # 标题

    # Content - 两种载体（问题所在）
    blocks: List[ContentBlock] = []      # 有序内容块 (EPUB uses this)
    sentences: List[ContentSentence] = [] # 句子列表 (Podcast/RSS uses this)

    # Optional fields
    language: str = "en"
    audio_url: Optional[str] = None      # 整体音频 URL (Podcast)
    thumbnail_url: Optional[str] = None
    published_at: Optional[datetime] = None
    full_text: Optional[str] = None      # 完整原文
    source_url: Optional[str] = None     # 原始链接
    metadata: Dict[str, Any] = {}        # 扩展元数据
```

### 2.5 ContentSentence Model

```python
class ContentSentence(BaseModel):
    """单个可学习的句子单元。"""
    text: str
    translation: Optional[str] = None
    audio_url: Optional[str] = None      # 句子级音频
    start_time: Optional[float] = None   # 音频起始时间戳
    end_time: Optional[float] = None     # 音频结束时间戳
```

## 3. Current Provider Interface

### 3.1 BaseContentProvider

```python
# app/services/content_providers/base.py

class BaseContentProvider(ABC):
    """内容提供者抽象基类。"""

    @property
    @abstractmethod
    def source_type(self) -> SourceType:
        """返回该 Provider 对应的内容源类型"""
        pass

    @abstractmethod
    async def fetch(self, **kwargs: Any) -> ContentBundle:
        """
        核心获取方法。
        Args:
            **kwargs: Provider-specific arguments
        Returns:
            ContentBundle: 标准化内容对象
        """
        pass
```

### 3.2 ContentService (Registry)

```python
# app/services/content_service.py

class ContentService:
    """Content Service (Factory & Registry)."""

    def __init__(self):
        self._providers: Dict[SourceType, BaseContentProvider] = {}
        # Register standard providers
        self.register_provider(EpubProvider())
        self.register_provider(RssProvider())
        self.register_provider(PodcastProvider())
        self.register_provider(PlainTextProvider())

    def register_provider(self, provider: BaseContentProvider):
        """注册一个新的 Content Provider"""
        self._providers[provider.source_type] = provider

    async def get_content(
        self, source_type: SourceType, **params: Any
    ) -> ContentBundle:
        """获取内容的通用入口。"""
        provider = self._providers.get(source_type)
        return await provider.fetch(**params)

# Global Singleton
content_service = ContentService()
```

## 4. Current Frontend Rendering

### 4.1 ReaderView Block Rendering

```jsx
// apps/web/src/components/reading/ReaderView.jsx

const renderContent = () => {
  // Use blocks structure if available
  if (article.blocks && article.blocks.length > 0) {
    return article.blocks.map((block, blockIdx) => {
      switch (block.type) {
        case "heading":
          return <div className={headingClass}>{block.text}</div>;

        case "image":
          return <MemoizedImage src={imgUrl} alt={block.alt} ... />;

        case "paragraph":
          return (
            <div className="mb-4">
              {block.sentences.map((sentence, sentIdx) => (
                <MemoizedSentence
                  text={sentence}
                  highlightSet={article.highlightSet}
                  studyHighlightSet={article.studyHighlightSet}
                  ...
                />
              ))}
            </div>
          );

        case "subtitle":
          return <div className="italic">{block.text}</div>;
      }
    });
  }
  return null;
};
```

### 4.2 MemoizedSentence Features

```jsx
// apps/web/src/components/reading/MemoizedSentence.jsx

// 核心功能：
// 1. 词汇高亮 (COCA/CET vocabulary)
// 2. 学习高亮 (words looked up during study - amber)
// 3. 搭配词组渲染 (collocations as grouped units)
// 4. 不清楚句子标记 (colored left borders)
// 5. 性能优化 (custom arePropsEqual for memo)
```

## 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTENT SOURCES                                  │
├─────────────┬─────────────┬─────────────┬─────────────────────────────┤
│    EPUB     │     RSS     │   Podcast   │       Plain Text            │
│  (local)    │  (remote)   │  (remote)   │       (direct)              │
└──────┬──────┴──────┬──────┴──────┬──────┴──────────┬──────────────────┘
       │             │             │                  │
       ▼             ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONTENT PROVIDERS                                 │
│                                                                          │
│   EpubProvider      RssProvider      PodcastProvider    PlainTextProv.  │
│   ├─ LRU Cache      ├─ HTTP Client   ├─ Inherits RSS    ├─ Simple       │
│   ├─ Image Extract  ├─ SSL Fallback  └─ Audio URL       └─ Sentence     │
│   └─ Block Parse    └─ Proxy Support                        Split       │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTENT SERVICE                                  │
│                                                                          │
│   content_service.get_content(source_type, **params)                    │
│   └─ Routes to appropriate provider based on source_type                │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTENT BUNDLE                                   │
│                                                                          │
│   {                                                                      │
│     id: "epub:filename:0",                                              │
│     source_type: "epub",                                                │
│     title: "Article Title",                                             │
│     blocks: [...],           ← EPUB uses this                           │
│     sentences: [...],        ← Podcast/RSS uses this (问题!)            │
│     audio_url: "...",        ← Podcast only                             │
│     metadata: {...}                                                      │
│   }                                                                      │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API ROUTES                                     │
│                                                                          │
│   GET /api/content/bundle?source_id=epub:item_id:0                      │
│   GET /api/content/asset?source_id=epub:item_id:0&path=...              │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND HOOKS                                    │
│                                                                          │
│   useArticleReader(articleId)                                           │
│   ├─ useQuery() for data fetching                                       │
│   └─ useReadingTracker() for behavior tracking                          │
│                                                                          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       REACT COMPONENTS                                   │
│                                                                          │
│   ReadingMode                                                            │
│   ├─ ArticleListView (library grid)                                     │
│   └─ ReaderView                                                          │
│       ├─ MemoizedSentence (词汇高亮、点击交互)                           │
│       ├─ MemoizedImage (懒加载、点击放大)                                │
│       └─ WordInspector / SentenceInspector (侧边栏)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 6. Identified Problems

### 6.1 Dual Content Carriers

**问题**: `ContentBundle` 同时有 `blocks` 和 `sentences` 两种内容载体

```python
# 当前状态
class ContentBundle(BaseModel):
    blocks: List[ContentBlock] = []      # EPUB 用这个
    sentences: List[ContentSentence] = [] # Podcast/RSS 用这个
```

**影响**:

- 前端需要判断使用哪个字段
- 新增内容类型时不确定该用哪个
- 语义不清晰

### 6.2 Tightly Coupled Rendering

**问题**: `ReaderView` 直接处理所有 block types

```jsx
// 当前状态 - 所有渲染逻辑在一个组件里
switch (block.type) {
  case "heading": ...
  case "image": ...
  case "paragraph": ...
  case "subtitle": ...
}
```

**影响**:

- 添加新内容类型需要修改 `ReaderView`
- 不同内容类型的渲染逻辑混在一起
- 难以为特定内容类型定制 UI

### 6.3 Podcast Isolation

**问题**: Podcast 组件完全独立，没有复用 Reading 的基础设施

**影响**:

- 词汇高亮逻辑重复实现
- 词典查询功能不一致
- 阅读追踪分离

## 7. What Works Well (Keep)

### 7.1 Provider Registry Pattern ✅

```python
# 这个模式很好，保持不变
content_service.register_provider(EpubProvider())
content_service.get_content(source_type, **params)
```

### 7.2 Block-Based Structure ✅

```python
# blocks 结构很好，应该统一使用
blocks: List[ContentBlock] = [
    ContentBlock(type=BlockType.HEADING, text="...", level=1),
    ContentBlock(type=BlockType.PARAGRAPH, sentences=["...", "..."]),
    ContentBlock(type=BlockType.IMAGE, image_path="..."),
]
```

### 7.3 MemoizedSentence Performance ✅

```jsx
// 性能优化做得很好，保持不变
const MemoizedSentence = memo(function MemoizedSentence({...}) {
  // Custom arePropsEqual for Set comparison
}, arePropsEqual);
```

### 7.4 Shared Hooks ✅

```typescript
// 这些 hooks 很好，应该继续复用
useReadingTracker();
useWordExplainer();
useSentenceExplainer();
```

---

_Next: [03-backend-design.md](./03-backend-design.md) - 后端设计_
