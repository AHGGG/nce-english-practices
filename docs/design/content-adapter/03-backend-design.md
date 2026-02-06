# 03 - Backend Design

> 后端 Provider 接口、Schema 变更

## 1. Schema Changes

### 1.1 SourceType Extension

```python
# app/models/content_schemas.py

class SourceType(str, Enum):
    # Existing
    EPUB = "epub"
    PODCAST = "podcast"
    RSS = "rss"
    PLAIN_TEXT = "plain_text"

    # New (Phase 2+)
    AUDIOBOOK = "audiobook"    # Phase 2
    COMIC = "comic"            # Phase 3
    PDF = "pdf"                # Future
```

### 1.2 BlockType Extension

```python
class BlockType(str, Enum):
    # Existing
    PARAGRAPH = "paragraph"
    IMAGE = "image"
    HEADING = "heading"
    SUBTITLE = "subtitle"

    # New (Phase 2)
    AUDIO_SEGMENT = "audio_segment"  # 带时间戳的音频片段
```

### 1.3 ContentBlock Extension

```python
class ContentBlock(BaseModel):
    """
    A single content block in an article.
    Preserves DOM order for accurate rendering.
    """
    type: BlockType

    # === Existing Fields (unchanged) ===

    # For PARAGRAPH/HEADING/SUBTITLE
    text: Optional[str] = None
    sentences: List[str] = []

    # For IMAGE
    image_path: Optional[str] = None
    alt: Optional[str] = None
    caption: Optional[str] = None

    # For HEADING
    level: Optional[int] = None

    # === New Fields (Phase 2) ===

    # For AUDIO_SEGMENT (audiobook subtitles)
    audio_url: Optional[str] = None       # Audio clip URL
    start_time: Optional[float] = None    # Start timestamp (seconds)
    end_time: Optional[float] = None      # End timestamp (seconds)
```

### 1.4 ContentBundle Simplification

```python
class ContentBundle(BaseModel):
    """
    统一内容包 - 所有 Content Provider 的标准输出格式。

    IMPORTANT: 统一使用 blocks 作为内容载体。
    sentences 字段已废弃，保留仅为向后兼容。
    """
    id: str
    source_type: SourceType
    title: str

    # === Primary Content Carrier ===
    blocks: List[ContentBlock] = []

    # === Deprecated (backward compatibility only) ===
    # @deprecated: Use blocks with BlockType.PARAGRAPH instead
    sentences: List[ContentSentence] = []

    # === Optional Fields ===
    language: str = "en"
    audio_url: Optional[str] = None      # Full audio URL (Podcast/Audiobook)
    thumbnail_url: Optional[str] = None
    published_at: Optional[datetime] = None
    full_text: Optional[str] = None
    source_url: Optional[str] = None
    metadata: Dict[str, Any] = {}
```

## 2. Provider Interface (No Change)

现有的 `BaseContentProvider` 接口已经足够灵活，**不需要修改**：

```python
# app/services/content_providers/base.py (unchanged)

class BaseContentProvider(ABC):
    @property
    @abstractmethod
    def source_type(self) -> SourceType:
        pass

    @abstractmethod
    async def fetch(self, **kwargs: Any) -> ContentBundle:
        pass
```

## 3. Existing Provider Updates

### 3.1 RssProvider / PodcastProvider Migration

**目标**: 将 `sentences` 输出迁移到 `blocks`

**Before**:

```python
# 当前 RssProvider 输出
return ContentBundle(
    sentences=[
        ContentSentence(text="Sentence 1"),
        ContentSentence(text="Sentence 2"),
    ]
)
```

**After**:

```python
# 迁移后输出
return ContentBundle(
    blocks=[
        ContentBlock(
            type=BlockType.PARAGRAPH,
            sentences=["Sentence 1", "Sentence 2", ...]
        )
    ],
    # 保留 sentences 用于向后兼容
    sentences=[
        ContentSentence(text="Sentence 1"),
        ContentSentence(text="Sentence 2"),
    ]
)
```

### 3.2 Migration Checklist

| Provider          | 当前状态       | 需要修改    | 修改内容         |
| ----------------- | -------------- | ----------- | ---------------- |
| EpubProvider      | 使用 blocks    | ❌ 无需修改 | -                |
| RssProvider       | 使用 sentences | ✅ 需要修改 | 添加 blocks 输出 |
| PodcastProvider   | 使用 sentences | ✅ 需要修改 | 添加 blocks 输出 |
| PlainTextProvider | 使用 sentences | ✅ 需要修改 | 添加 blocks 输出 |

## 4. New Provider: AudiobookProvider (Phase 2)

### 4.1 File Location

```
app/services/content_providers/audiobook_provider.py
```

### 4.2 Interface

```python
# app/services/content_providers/audiobook_provider.py

from pathlib import Path
from typing import List, Optional, Any
from app.models.content_schemas import (
    ContentBundle, ContentBlock, BlockType, SourceType
)
from app.services.content_providers.base import BaseContentProvider


class AudiobookProvider(BaseContentProvider):
    """
    有声书内容提供者。

    支持格式：
    - 音频文件 + SRT/VTT 字幕
    - 音频文件 + LRC 歌词

    目录结构：
    resources/audiobooks/
    ├── book_name/
    │   ├── audio.mp3
    │   ├── subtitles.srt (or .vtt, .lrc)
    │   └── metadata.json (optional)
    """

    AUDIOBOOK_DIR = Path("resources/audiobooks")

    @property
    def source_type(self) -> SourceType:
        return SourceType.AUDIOBOOK

    async def fetch(
        self,
        book_id: str,
        chapter_index: int = 0,
        **kwargs: Any
    ) -> ContentBundle:
        """
        获取有声书章节内容。

        Args:
            book_id: 有声书目录名
            chapter_index: 章节索引

        Returns:
            ContentBundle with AUDIO_SEGMENT blocks
        """
        # Implementation details in Phase 2 doc
        pass

    def _parse_srt(self, srt_path: Path) -> List[ContentBlock]:
        """解析 SRT 字幕文件为 AUDIO_SEGMENT blocks"""
        pass

    def _parse_vtt(self, vtt_path: Path) -> List[ContentBlock]:
        """解析 VTT 字幕文件为 AUDIO_SEGMENT blocks"""
        pass

    def _parse_lrc(self, lrc_path: Path) -> List[ContentBlock]:
        """解析 LRC 歌词文件为 AUDIO_SEGMENT blocks"""
        pass
```

### 4.3 Output Format

```python
# AudiobookProvider 输出示例
ContentBundle(
    id="audiobook:harry_potter_1:0",
    source_type=SourceType.AUDIOBOOK,
    title="Harry Potter - Chapter 1",
    audio_url="/api/content/audiobook/harry_potter_1/audio",
    blocks=[
        ContentBlock(
            type=BlockType.AUDIO_SEGMENT,
            text="Mr. and Mrs. Dursley, of number four, Privet Drive...",
            sentences=["Mr. and Mrs. Dursley, of number four, Privet Drive..."],
            start_time=0.0,
            end_time=5.2,
        ),
        ContentBlock(
            type=BlockType.AUDIO_SEGMENT,
            text="They were the last people you'd expect to be involved...",
            sentences=["They were the last people you'd expect to be involved..."],
            start_time=5.2,
            end_time=10.8,
        ),
        # ... more segments
    ],
    metadata={
        "book_id": "harry_potter_1",
        "chapter_index": 0,
        "total_chapters": 17,
        "duration": 3600,  # seconds
    }
)
```

## 5. New Provider: ComicProvider (Phase 3)

### 5.1 File Location

```
app/services/content_providers/comic_provider.py
```

### 5.2 New Models (Comic-specific)

```python
# app/models/comic_schemas.py (Phase 3)

class BoundingBox(BaseModel):
    """OCR 文字边界框"""
    x_percent: float      # 相对于图片宽度的百分比
    y_percent: float      # 相对于图片高度的百分比
    width_percent: float
    height_percent: float

class TextRegion(BaseModel):
    """OCR 识别的文字区域"""
    id: str
    text: str
    bounds: BoundingBox
    confidence: float = 1.0
    reading_order: int = 0

class ComicPage(BaseModel):
    """漫画页面"""
    page_index: int
    image_url: str
    text_regions: List[TextRegion] = []
    full_text: Optional[str] = None  # 所有文字拼接
```

### 5.3 Interface Preview

```python
# app/services/content_providers/comic_provider.py (Phase 3)

class ComicProvider(BaseContentProvider):
    """
    漫画内容提供者。

    支持格式：
    - CBZ/CBR (压缩包)
    - 图片目录

    OCR 支持：
    - 可选启用 OCR 识别
    - 缓存 OCR 结果
    """

    @property
    def source_type(self) -> SourceType:
        return SourceType.COMIC

    async def fetch(
        self,
        comic_id: str,
        page_index: int = 0,
        enable_ocr: bool = True,
        **kwargs: Any
    ) -> ContentBundle:
        """获取漫画页面内容"""
        pass

    async def get_page_image(
        self,
        comic_id: str,
        page_index: int
    ) -> bytes:
        """获取页面图片"""
        pass
```

## 6. ContentService Updates

### 6.1 Registration

```python
# app/services/content_service.py

class ContentService:
    def __init__(self):
        self._providers: Dict[SourceType, BaseContentProvider] = {}

        # Existing providers
        self.register_provider(EpubProvider())
        self.register_provider(RssProvider())
        self.register_provider(PodcastProvider())
        self.register_provider(PlainTextProvider())

        # New providers (Phase 2+)
        # self.register_provider(AudiobookProvider())  # Phase 2
        # self.register_provider(ComicProvider())      # Phase 3
```

### 6.2 Lazy Loading (Optional Optimization)

```python
# 可选：延迟加载 Provider，避免启动时加载所有依赖

class ContentService:
    def __init__(self):
        self._providers: Dict[SourceType, BaseContentProvider] = {}
        self._provider_factories: Dict[SourceType, Callable] = {
            SourceType.EPUB: lambda: EpubProvider(),
            SourceType.RSS: lambda: RssProvider(),
            SourceType.PODCAST: lambda: PodcastProvider(),
            SourceType.PLAIN_TEXT: lambda: PlainTextProvider(),
            SourceType.AUDIOBOOK: lambda: AudiobookProvider(),
            SourceType.COMIC: lambda: ComicProvider(),
        }

    def _get_provider(self, source_type: SourceType) -> BaseContentProvider:
        if source_type not in self._providers:
            factory = self._provider_factories.get(source_type)
            if not factory:
                raise ValueError(f"No provider for {source_type}")
            self._providers[source_type] = factory()
        return self._providers[source_type]
```

## 7. API Routes

### 7.1 Existing Routes (No Change)

```python
# 现有路由保持不变
GET /api/reading/article?source_id={id}
GET /api/reading/epub/image?filename={}&image_path={}
```

### 7.2 New Routes (Phase 2+)

```python
# Phase 2: Audiobook
GET /api/content/audiobook/{book_id}/chapters
GET /api/content/audiobook/{book_id}/chapter/{index}
GET /api/content/audiobook/{book_id}/audio
GET /api/content/audiobook/{book_id}/audio/clip?start={}&end={}

# Phase 3: Comic
GET /api/content/comic/{comic_id}/pages
GET /api/content/comic/{comic_id}/page/{index}
GET /api/content/comic/{comic_id}/page/{index}/image
POST /api/content/comic/{comic_id}/page/{index}/ocr
```

## 8. Database Schema (Optional)

如果需要持久化内容元数据，可以添加以下表：

```python
# app/models/orm.py (Optional)

class ContentSource(Base):
    """内容源元数据"""
    __tablename__ = "content_sources"

    id = Column(String, primary_key=True)  # e.g., "audiobook:harry_potter_1"
    source_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    metadata_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

class ContentProgress(Base):
    """用户阅读进度"""
    __tablename__ = "content_progress"

    id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    source_id = Column(String, nullable=False, index=True)
    progress_percent = Column(Float, default=0.0)
    last_position = Column(JSON)  # {chapter: 0, block: 5, time: 123.4}
    updated_at = Column(DateTime, default=datetime.utcnow)
```

## 9. Implementation Checklist

### Phase 1 (Renderer Abstraction)

- [ ] 无后端修改

### Phase 2 (Audiobook Support)

- [ ] 扩展 `SourceType` 枚举
- [ ] 扩展 `BlockType` 枚举
- [ ] 扩展 `ContentBlock` 模型
- [ ] 创建 `AudiobookProvider`
- [ ] 注册到 `ContentService`
- [ ] 添加 API 路由
- [ ] 迁移 RSS/Podcast Provider 使用 blocks

### Phase 3 (Comic Support)

- [ ] 创建 `comic_schemas.py`
- [ ] 创建 `ComicProvider`
- [ ] 集成 OCR 服务
- [ ] 添加 API 路由

---

_Next: [04-frontend-design.md](./04-frontend-design.md) - 前端设计_
