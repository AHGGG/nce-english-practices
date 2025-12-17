
import os
import asyncio
from typing import Optional
from app.services.voice_lab import voice_lab_service

REFERENCE_TEXT = "This is a verification test."
AUDIO_DIR = os.path.dirname(__file__)
REFERENCE_AUDIO_PATH = os.path.join(AUDIO_DIR, "reference.wav")

def validate_audio_format(data: bytes, min_length: int = 100) -> bool:
    """
    Basic validation that we received some likely-audio bytes.
    """
    if not data:
        return False
    if len(data) < min_length:
        return False
    # Future: check magic numbers for mp3/wav/webm
    return True

async def get_or_create_reference_audio() -> bytes:
    """
    Returns bytes of a reference audio file.
    If 'reference.wav' does not exist, uses Google or Azure TTS to create it.
    """
    if os.path.exists(REFERENCE_AUDIO_PATH):
        with open(REFERENCE_AUDIO_PATH, "rb") as f:
            return f.read()
    
    # Try to generate one
    print("Generating reference audio for tests...")
    
    # Try generic providers
    # Prefer Azure or Google as they are usually reliable for standard US English
    providers = ["azure", "google", "deepgram", "elevenlabs"]
    
    for p_name in providers:
        try:
            provider = voice_lab_service.get_provider(p_name)
            # Use 'default' or first available voice
            config = provider.get_config()
            voice_id = config["voices"][0]
            
            chunks = []
            async for chunk in provider.tts(REFERENCE_TEXT, voice_id, "default"):
                chunks.append(chunk)
            
            full_audio = b"".join(chunks)
            
            if len(full_audio) > 1000:
                # Save it
                with open(REFERENCE_AUDIO_PATH, "wb") as f:
                    f.write(full_audio)
                return full_audio
        except Exception as e:
            print(f"Failed to bootstrap audio with {p_name}: {e}")
            continue
            
    raise RuntimeError("Could not generate reference audio. Please enable at least one TTS provider.")
