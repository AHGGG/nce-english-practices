"""
Manual Verification Script for Deepgram WebSocket Features

Run this script against a live server to test:
- Live STT (with audio streaming)
- Streaming TTS (with audio playback)
- Voice Agent (full STT -> LLM -> TTS loop)

Usage:
    1. Start the server: .\scripts\dev.ps1
    2. Run this script: uv run python tests/verification/verify_deepgram_websocket.py
"""

import asyncio
import json
import os
import sys
import struct
import wave

# Ensure app imports work
sys.path.insert(0, os.getcwd())

from app.config import settings

try:
    import websockets
except ImportError:
    print("Error: 'websockets' package required. Install with: pip install websockets")
    sys.exit(1)


# Config
WS_BASE = "wss://localhost:5173/api/voice-lab/deepgram"  # Use wss for https
REFERENCE_AUDIO = os.path.join(os.path.dirname(__file__), "reference.wav")


def load_wav_as_pcm(wav_path: str, target_sample_rate: int = 16000) -> bytes:
    """Load WAV and convert to 16kHz mono 16-bit PCM."""
    with wave.open(wav_path, "rb") as wf:
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        frame_rate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_data = wf.readframes(n_frames)

    if sample_width == 2:
        samples = struct.unpack(f"{len(raw_data) // 2}h", raw_data)
    else:
        raise ValueError(f"Unsupported sample width: {sample_width}")

    if channels == 2:
        samples = [
            (samples[i] + samples[i + 1]) // 2 for i in range(0, len(samples), 2)
        ]

    if frame_rate != target_sample_rate:
        ratio = target_sample_rate / frame_rate
        new_length = int(len(samples) * ratio)
        samples = [
            samples[int(i / ratio)]
            for i in range(new_length)
            if int(i / ratio) < len(samples)
        ]

    return struct.pack(f"{len(samples)}h", *[int(s) for s in samples])


async def test_live_stt():
    """Test Deepgram Live STT with real audio."""
    print("\n=== Testing Live STT ===")

    if not os.path.exists(REFERENCE_AUDIO):
        print(f"SKIP: {REFERENCE_AUDIO} not found")
        return False

    pcm_data = load_wav_as_pcm(REFERENCE_AUDIO)
    print(f"Loaded {len(pcm_data)} bytes of PCM audio")

    url = f"{WS_BASE}/live-stt?model=nova-3"

    try:
        # Note: ssl verification disabled for self-signed cert
        import ssl

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        async with websockets.connect(url, ssl=ssl_context) as ws:
            # Wait for ready
            msg = json.loads(await ws.recv())
            print(f"Ready: {msg}")

            # Send audio in chunks
            chunk_size = 3200  # 100ms at 16kHz
            for i in range(
                0, min(len(pcm_data), chunk_size * 20), chunk_size
            ):  # ~2 seconds
                chunk = pcm_data[i : i + chunk_size]
                await ws.send(chunk)
                await asyncio.sleep(0.1)

            # Collect transcripts
            transcripts = []
            try:
                while True:
                    msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=3.0))
                    if msg.get("type") == "transcript":
                        transcripts.append(msg.get("text", ""))
                        print(
                            f"Transcript: {msg.get('text')} (final: {msg.get('is_final')})"
                        )
                        if msg.get("is_final"):
                            break
            except asyncio.TimeoutError:
                pass

            if transcripts:
                full_text = " ".join(transcripts)
                print(f"✓ Full transcript: {full_text}")
                return True
            else:
                print("✗ No transcripts received")
                return False

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


async def test_streaming_tts():
    """Test Deepgram Streaming TTS."""
    print("\n=== Testing Streaming TTS ===")

    url = f"{WS_BASE}/streaming-tts?voice=aura-asteria-en"

    try:
        import ssl

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        async with websockets.connect(url, ssl=ssl_context) as ws:
            # Wait for ready
            msg = json.loads(await ws.recv())
            print(f"Ready: {msg}")

            # Send text
            await ws.send(
                json.dumps({"type": "text", "content": "Hello, this is a test."})
            )
            await ws.send(json.dumps({"type": "flush"}))

            # Collect audio
            audio_chunks = []
            try:
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    if isinstance(msg, bytes):
                        audio_chunks.append(msg)
                        print(f"Received {len(msg)} audio bytes")
                    else:
                        data = json.loads(msg)
                        if data.get("type") == "flushed":
                            print("Flushed signal received")
                            break
            except asyncio.TimeoutError:
                pass

            await ws.send(json.dumps({"type": "close"}))

            total_audio = sum(len(c) for c in audio_chunks)
            if total_audio > 0:
                print(f"✓ Received {total_audio} total audio bytes")
                return True
            else:
                print("✗ No audio received")
                return False

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


async def test_voice_agent():
    """Test Deepgram Voice Agent (STT -> LLM -> TTS)."""
    print("\n=== Testing Voice Agent ===")

    if not os.path.exists(REFERENCE_AUDIO):
        print(f"SKIP: {REFERENCE_AUDIO} not found")
        return False

    pcm_data = load_wav_as_pcm(REFERENCE_AUDIO)

    url = f"{WS_BASE}/voice-agent?stt_model=nova-3&tts_voice=aura-asteria-en"

    try:
        import ssl

        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        async with websockets.connect(url, ssl=ssl_context) as ws:
            # Wait for ready
            msg = json.loads(await ws.recv())
            print(f"Ready: {msg}")

            # Send audio
            chunk_size = 3200
            for i in range(0, min(len(pcm_data), chunk_size * 15), chunk_size):
                await ws.send(pcm_data[i : i + chunk_size])
                await asyncio.sleep(0.1)

            # Collect results
            transcripts = []
            llm_responses = []
            audio_count = 0

            try:
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
                    if isinstance(msg, bytes):
                        audio_count += 1
                    else:
                        data = json.loads(msg)
                        if data.get("type") == "transcript":
                            transcripts.append(data.get("text", ""))
                            print(
                                f"STT: {data.get('text')} (final: {data.get('is_final')})"
                            )
                        elif data.get("type") == "llm_response":
                            llm_responses.append(data.get("text", ""))
                            print(f"LLM: {data.get('text')[:100]}...")
                            break  # Got response, done
            except asyncio.TimeoutError:
                pass

            print(
                f"\nResults: {len(transcripts)} transcripts, {len(llm_responses)} LLM responses, {audio_count} audio chunks"
            )

            success = len(transcripts) > 0 and len(llm_responses) > 0
            print(
                "✓ Voice Agent flow completed"
                if success
                else "✗ Voice Agent incomplete"
            )
            return success

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


async def main():
    print("=" * 60)
    print("Deepgram WebSocket Manual Verification")
    print("=" * 60)

    if not settings.DEEPGRAM_API_KEY:
        print("ERROR: DEEPGRAM_API_KEY not set in environment")
        return

    print(f"Server: {WS_BASE}")
    print(f"Reference Audio: {REFERENCE_AUDIO}")
    print("Make sure the server is running (./scripts/dev.ps1)")

    results = {
        "Live STT": await test_live_stt(),
        "Streaming TTS": await test_streaming_tts(),
        "Voice Agent": await test_voice_agent(),
    }

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {name}: {status}")

    all_passed = all(results.values())
    print("\n" + ("All tests passed!" if all_passed else "Some tests failed."))


if __name__ == "__main__":
    asyncio.run(main())
