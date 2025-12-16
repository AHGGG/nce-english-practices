import edge_tts
import asyncio
import tempfile
import os

class TTSService:
    def __init__(self):
        # Default voice: en-US-BrianMultilingualNeural (Good male voice)
        # or en-US-AriaNeural (Female)
        self.default_voice = "en-US-AndrewMultilingualNeural" 

    async def generate_audio(self, text: str, voice: str = None) -> bytes:
        """
        Generate MP3 audio from text.
        """
        voice = voice or self.default_voice
        communicate = edge_tts.Communicate(text, voice)
        
        # edge-tts async API writes to file or stream. 
        # We'll stream to memory.
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
                
        return audio_data

    async def get_available_voices(self):
        return await edge_tts.list_voices()

tts_service = TTSService()
