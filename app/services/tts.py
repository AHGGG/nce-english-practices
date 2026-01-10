"""
TTS Service - Text-to-Speech using Deepgram API (Primary) with Edge TTS fallback.
"""

import httpx
import edge_tts

from app.config import settings


class TTSService:
    def __init__(self):
        # Deepgram voice options (Aura models)
        self.default_deepgram_voice = "aura-asteria-en"  # Female, natural
        # Edge TTS voice (fallback)
        self.default_edge_voice = "en-US-AndrewMultilingualNeural"

    async def generate_audio(self, text: str, voice: str = None) -> bytes:
        """
        Generate MP3 audio from text.

        Uses Deepgram by default. Falls back to Edge TTS if Deepgram fails.
        """
        # Try Deepgram first
        if settings.DEEPGRAM_API_KEY:
            try:
                return await self._generate_deepgram(text, voice)
            except Exception as e:
                print(f"Deepgram TTS failed, falling back to Edge TTS: {e}")

        # Fallback to Edge TTS
        return await self._generate_edge(text, voice)

    async def _generate_deepgram(self, text: str, voice: str = None) -> bytes:
        """Generate audio using Deepgram TTS API."""
        voice_model = voice or self.default_deepgram_voice

        url = f"https://api.deepgram.com/v1/speak?model={voice_model}&encoding=mp3"
        headers = {
            "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {"text": text}

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)

            if response.status_code != 200:
                raise Exception(
                    f"Deepgram TTS Failed ({response.status_code}): {response.text}"
                )

            return response.content

    async def _generate_edge(self, text: str, voice: str = None) -> bytes:
        """Generate audio using Edge TTS (fallback)."""
        voice = voice or self.default_edge_voice
        communicate = edge_tts.Communicate(text, voice)

        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]

        return audio_data

    async def get_available_voices(self):
        """List available voices."""
        return {
            "deepgram": [
                "aura-asteria-en",  # US Female
                "aura-luna-en",  # US Female
                "aura-stella-en",  # US Female
                "aura-athena-en",  # UK Female
                "aura-hera-en",  # US Female
                "aura-orion-en",  # US Male
                "aura-arcas-en",  # US Male
                "aura-perseus-en",  # US Male
                "aura-helios-en",  # UK Male
            ],
            "edge_tts": await edge_tts.list_voices(),
        }


tts_service = TTSService()
