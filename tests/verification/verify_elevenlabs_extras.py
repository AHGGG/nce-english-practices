import asyncio
import os
import sys

# Ensure app imports work
sys.path.insert(0, os.getcwd())

from app.services.voice_lab import voice_lab_service
from app.config import settings


async def verify_elevenlabs_extras():
    print("--- Verifying ElevenLabs Extra Features ---")

    if not settings.ELEVENLABS_API_KEY:
        print("SKIP: No ELEVENLABS_API_KEY found in env.")
        return

    provider = voice_lab_service.get_provider("elevenlabs")

    # 1. Test Text to Sound Effects
    print("\n1. Testing Text to Sound Effects ('Cinematic Boom')...")
    try:
        sfx_chunks = []
        async for chunk in provider.text_to_sfx(
            "Cinematic boom sound effect", duration_seconds=2.0
        ):
            sfx_chunks.append(chunk)

        full_sfx = b"".join(sfx_chunks)
        print(f"SFX Success: Generated {len(full_sfx)} bytes.")

        with open("test_elevenlabs_sfx.mp3", "wb") as f:
            f.write(full_sfx)
        print("Saved 'test_elevenlabs_sfx.mp3'")

    except Exception as e:
        print(f"SFX Failed: {e}")

    # 2. Test Speech to Speech (Voice Changer)
    # We need an input audio file. We can use the SFX we just generated if it exists,
    # or generate a quick TTS one. Let's start with a quick TTS for clear speech.
    print("\n2. Preparing audio for Voice Changer...")
    input_audio = None
    try:
        tts_chunks = []
        async for chunk in provider.tts(
            "This is the original voice.", "21m00Tcm4TlvDq8ikWAM", "eleven_turbo_v2_5"
        ):
            tts_chunks.append(chunk)
        input_audio = b"".join(tts_chunks)
        print(f"Generated input TTS audio: {len(input_audio)} bytes.")
    except Exception as e:
        print(f"Prerequisite TTS Failed: {e}")

    if input_audio:
        print("3. Testing Speech to Speech (Target: 'Fin')...")
        try:
            # Target voice: Fin (D38z5RcWu1voky8WS1ja)
            sts_chunks = []
            target_voice_id = "D38z5RcWu1voky8WS1ja"

            async for chunk in provider.speech_to_speech(input_audio, target_voice_id):
                sts_chunks.append(chunk)

            full_sts = b"".join(sts_chunks)
            print(f"STS Success: Generated {len(full_sts)} bytes.")

            with open("test_elevenlabs_sts.mp3", "wb") as f:
                f.write(full_sts)
            print("Saved 'test_elevenlabs_sts.mp3'")

        except Exception as e:
            print(f"STS Failed: {e}")
    else:
        print("Skipping STS - No input audio available.")


if __name__ == "__main__":
    asyncio.run(verify_elevenlabs_extras())
