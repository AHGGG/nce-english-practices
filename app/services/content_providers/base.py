from abc import ABC, abstractmethod
from typing import Any
from app.models.content_schemas import ContentBundle, SourceType

class BaseContentProvider(ABC):
    """
    内容提供者抽象基类。
    Abstract base class for all content providers.
    """

    @property
    @abstractmethod
    def source_type(self) -> SourceType:
        """返回该 Provider 对应的内容源类型"""
        pass

    @abstractmethod
    async def fetch(self, **kwargs: Any) -> ContentBundle:
        """
        核心获取方法。
        Fetches content from the source and returns a standardized ContentBundle.
        
        Args:
            **kwargs: Arbitrary arguments specific to the provider implementation.
                     (e.g., file_hash for EPUB, feed_url for Podcast)
                     
        Returns:
            ContentBundle: The standardized content object.
        """
        pass
