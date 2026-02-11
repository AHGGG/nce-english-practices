import hashlib
from typing import Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.orm import GeneratedImage
from app.config import settings
from app.services.log_collector import log_collector, LogLevel, LogCategory


class ImageGenerationService:
    """Service for handling image generation and caching via Zhipu GLM-Image API."""

    def _compute_hash(self, text: str) -> str:
        """Compute SHA256 hash of the normalized text."""
        normalized = text.strip().lower()
        return hashlib.sha256(normalized.encode()).hexdigest()

    def get_context_hash(self, sentence: str) -> str:
        """Public method to get hash for API clients. Using first 16 chars."""
        return self._compute_hash(sentence)[:16]

    async def get_cached(
        self, word: str, context_hash: str, db: AsyncSession
    ) -> Optional[GeneratedImage]:
        """Retrieve cached image from database."""
        stmt = select(GeneratedImage).where(
            GeneratedImage.word == word, GeneratedImage.context_hash == context_hash
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_generate_image(
        self, word: str, sentence: str, image_prompt: str, db: AsyncSession
    ) -> bytes:
        """
        Get existing image or generate new one.
        Returns raw image bytes.
        """
        context_hash = self.get_context_hash(sentence)

        # 1. Check cache
        cached = await self.get_cached(word, context_hash, db)
        if cached:
            return cached.image_data

        # 2. Generate new image
        try:
            image_bytes = await self._call_zhipu_api(image_prompt)
        except Exception as e:
            # Add logging here preferably
            log_collector.log(
                f"Image generation failed: {e}",
                level=LogLevel.ERROR,
                category=LogCategory.GENERAL,
                source="backend",
            )
            raise e

        # 3. Save to cache
        new_image = GeneratedImage(
            word=word,
            context_hash=context_hash,
            sentence=sentence,
            image_prompt=image_prompt,
            image_data=image_bytes,
            model="glm-image",
        )
        db.add(new_image)
        await db.commit()
        await db.refresh(new_image)

        return image_bytes

    async def _call_zhipu_api(self, prompt: str) -> bytes:
        """Call Zhipu GLM-Image API to generate image."""
        if not settings.ZHIPU_API_KEY:
            raise ValueError("ZHIPU_API_KEY is not set")

        url = "https://open.bigmodel.cn/api/paas/v4/images/generations"
        headers = {
            "Authorization": f"Bearer {settings.ZHIPU_API_KEY}",
            "Content-Type": "application/json",
        }

        # Using Zhipu GLM-Image defaults
        payload = {"model": "glm-image", "prompt": prompt, "size": "1024x1024"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

            # Check for error in response body if 200 OK but logical error
            if "error" in data:
                raise ValueError(f"API Error: {data['error']}")

            # Extract image URL
            if "data" not in data or not data["data"]:
                raise ValueError(f"Invalid API response structure: {data}")

            image_url = data["data"][0]["url"]

            # Download image
            img_response = await client.get(image_url, timeout=60.0)
            img_response.raise_for_status()
            return img_response.content


image_service = ImageGenerationService()
