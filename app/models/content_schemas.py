from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class SourceType(str, Enum):
    EPUB = "epub"
    PODCAST = "podcast"
    RSS = "rss"
    PLAIN_TEXT = "plain_text"


class BlockType(str, Enum):
    """Content block types for structured EPUB parsing."""
    PARAGRAPH = "paragraph"
    IMAGE = "image"
    HEADING = "heading"
    SUBTITLE = "subtitle"


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


class ContentImage(BaseModel):
    """
    内容中的图片。
    Represents an image within the content.
    """
    path: str                              # Image path within EPUB/source
    sentence_index: int                    # Index of the sentence AFTER which this image appears
    alt: Optional[str] = None              # Alt text
    caption: Optional[str] = None          # Figure caption if present


class ContentSentence(BaseModel):
    """
    单个可学习的句子单元。
    Represents a single learnable sentence unit.
    """
    text: str                              # 句子原文
    translation: Optional[str] = None      # 翻译
    audio_url: Optional[str] = None        # 句子级音频 (Podcast 片段)
    start_time: Optional[float] = None     # 音频起始时间戳 (秒)
    end_time: Optional[float] = None       # 音频结束时间戳


class ContentBundle(BaseModel):
    """
    统一内容包 - 所有 Content Provider 的标准输出格式。
    Unified content bundle - Standard output format for all Content Providers.
    """
    id: str                                 # 唯一 ID (Token/Hash)
    source_type: SourceType                 # 来源类型
    title: str                              # 标题
    
    # Content - at least one should be populated
    blocks: List[ContentBlock] = []         # 有序内容块 (EPUB uses this)
    sentences: List[ContentSentence] = []   # 句子列表 (Podcast/RSS uses this)
    
    # Optional fields - Provider-dependent
    language: str = "en"                    # 语言代码 (默认为 English)
    audio_url: Optional[str] = None         # 整体音频 URL (Podcast/Audiobook)
    thumbnail_url: Optional[str] = None     # 封面图
    published_at: Optional[datetime] = None # 发布时间
    full_text: Optional[str] = None         # 完整原文 (用于 EPUB 等长文本)
    source_url: Optional[str] = None        # 原始内容链接 (RSS Link / YT URL)
    metadata: Dict[str, Any] = {}           # 扩展元数据 (作者, 时长, tag等)
    images: List[ContentImage] = []         # 内容中的图片列表 (legacy, deprecated)

