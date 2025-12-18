
import asyncio
import os
import sys
from dotenv import load_dotenv

# Ensure app imports work
sys.path.insert(0, os.getcwd())

from app.services.voice_lab import voice_lab_service
from app.config import settings

async def verify_elevenlabs():
    print("--- Verifying ElevenLabs Integration ---")
    
    if not settings.ELEVENLABS_API_KEY:
        print("SKIP: No ELEVENLABS_API_KEY found in env.")
        return

    provider = voice_lab_service.get_provider("elevenlabs")
    
    # 1. Test TTS
    print("\n1. Testing TTS (using 'Rachel' voice)...")
    try:
        text = "Hello, this is a test of the ElevenLabs integration."
        voice_id = "21m00Tcm4TlvDq8ikWAM" # Rachel
        model = "eleven_turbo_v2_5" 
        
        # Collect audio
        audio_chunks = []
        async for chunk in provider.tts(text, voice_id, model):
            audio_chunks.append(chunk)
            
        full_audio = b"".join(audio_chunks)
        print(f"TTS Success: Generated {len(full_audio)} bytes of audio.")
        
        # Save to file for manual check
        with open("test_elevenlabs_output.mp3", "wb") as f:
            f.write(full_audio)
        print("Saved 'test_elevenlabs_output.mp3'")
        
    except Exception as e:
        print(f"TTS Failed: {e}")
        full_audio = None

    # 2. Test STT
    print("\n2. Testing STT (Scribe)...")
    if full_audio:
        try:
            # Use the just-generated audio for STT
            transcript = await provider.stt(full_audio)
            print(f"STT Transcript: {transcript}")
            
            if "test" in transcript.lower():
                print("STT Verification PASSED (Keywords found)")
            else:
                print("STT Verification WARNING (Keywords not found, check output)")
                
        except Exception as e:
            print(f"STT Failed: {e}")
    else:
        print("Skipping STT - No audio generated.")

if __name__ == "__main__":
    asyncio.run(verify_elevenlabs())
