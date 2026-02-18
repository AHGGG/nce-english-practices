from typing import Dict, Any
from app.models.content_schemas import ContentBundle, SourceType
from app.services.content_providers.base import BaseContentProvider

# Import specific providers
from app.services.content_providers.epub_provider import EpubProvider
from app.services.content_providers.rss_provider import RssProvider
from app.services.content_providers.podcast_provider import PodcastProvider
from app.services.content_providers.plain_text_provider import PlainTextProvider
from app.services.content_providers.audiobook_provider import AudiobookProvider


class ContentService:
    """
    Content Service (Factory & Registry).
    管理所有 Provider 并路由内容请求。
    """

    def __init__(self):
        self._providers: Dict[SourceType, BaseContentProvider] = {}

        # Register standard providers
        self.register_provider(EpubProvider())
        self.register_provider(RssProvider())
        self.register_provider(PodcastProvider())
        self.register_provider(PlainTextProvider())
        self.register_provider(AudiobookProvider())

    def register_provider(self, provider: BaseContentProvider):
        """注册一个新的 Content Provider"""
        self._providers[provider.source_type] = provider

    def get_provider(self, source_type: SourceType | str) -> BaseContentProvider:
        """Get provider instance by source type."""
        if isinstance(source_type, str):
            try:
                source_type = SourceType(source_type)
            except ValueError as exc:
                raise ValueError(f"Invalid source_type: {source_type}") from exc

        provider = self._providers.get(source_type)
        if not provider:
            raise ValueError(f"No provider registered for source type: {source_type}")
        return provider

    async def get_content(
        self, source_type: SourceType, **params: Any
    ) -> ContentBundle:
        """
        获取内容的通用入口。
        Routes the request to the appropriate provider based on source_type.
        """
        # 确保 source_type 是枚举类型
        if isinstance(source_type, str):
            try:
                source_type = SourceType(source_type)
            except ValueError:
                raise ValueError(f"Invalid source_type: {source_type}")

        provider = self.get_provider(source_type)
        return await provider.fetch(**params)


# Global Singleton
content_service = ContentService()
