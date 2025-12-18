
import abc
import os
import asyncio
import json
import logging
from typing import AsyncGenerator, Optional, Dict, Any

from app.config import settings

# Setup Logger
logger = logging.getLogger(__name__)

# --- Optional Imports to prevent crash if installation issues ---
try:
    from deepgram import DeepgramClient
except ImportError:
    DeepgramClient = None

try:
    from elevenlabs.client import ElevenLabs
except ImportError:
    ElevenLabs = None

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

# --- Base Class ---

class VoiceProvider(abc.ABC):
    @abc.abstractmethod
    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        """Stream audio bytes from TTS service."""
        pass

    @abc.abstractmethod
    async def stt(self, audio_data: bytes, model: str = "general") -> str:
        """Transcribe audio bytes."""
        pass
    
    @abc.abstractmethod
    def get_config(self) -> Dict[str, Any]:
        """Return available voices/models."""
        pass

    @abc.abstractmethod
    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        """Assess pronunciation."""
        pass

def create_wav_header(sample_rate=24000, channels=1, bits_per_sample=16, data_size=0xFFFFFFF):
    """
    Create a RIFF/WAVE header for streaming raw PCM audio.
    Using a large data_size placeholder since we are streaming.
    """
    # 44 bytes header
    import struct
    
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    
    # RIFF chunk
    header = b'RIFF'
    header += struct.pack('<I', 36 + data_size) # ChunkSize (36 + SubChunk2Size)
    header += b'WAVE'
    
    # fmt sub-chunk
    header += b'fmt '
    header += struct.pack('<I', 16) # SubChunk1Size (16 for PCM)
    header += struct.pack('<H', 1)  # AudioFormat (1 for PCM)
    header += struct.pack('<H', channels)
    header += struct.pack('<I', sample_rate)
    header += struct.pack('<I', byte_rate)
    header += struct.pack('<H', block_align)
    header += struct.pack('<H', bits_per_sample)
    
    # data sub-chunk
    header += b'data'
    header += struct.pack('<I', data_size)
    
    return header


# --- Implementations ---

class MockProvider(VoiceProvider):
    """Fallback provider for testing without keys."""
    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        yield b"mock_audio_data"
    
    async def stt(self, audio_data: bytes, model: str = "general") -> str:
        return "This is a mock transcription."

    def get_config(self) -> Dict[str, Any]:
        return {
            "voices": ["mock-male", "mock-female"]
        }

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        return {
            "accuracy": 95.0,
            "fluency": 90.0,
            "completeness": 100.0,
            "pronunciation": 92.0,
            "words": []
        }

class GoogleProvider(VoiceProvider):
    """Uses Google GenAI SDK (Gemini) for simple generation if available, 
    or standard Google Cloud if credentials provided. 
    For now, defaulting to GenAI as it's in the dependencies.
    """
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        if self.api_key and genai:
             # v1alpha required for Live API with these models
             self.client = genai.Client(api_key=self.api_key, http_options={'api_version': 'v1alpha'})

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["gemini-2.5-flash-native-audio-latest", "gemini-2.0-flash-exp"],
            "voices": ["Puck", "Charon", "Kore", "Fenrir", "Aoede"] # Standard Gemini voices
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.client:
            raise ValueError("Google GenAI Client not initialized (Missing Key or SDK).")
        
        # Use Gemini Live API for Native Audio Generation
        
        # Set default model if generic 'model' passed
        if model == "default" or not model:
            model = "gemini-2.5-flash-native-audio-latest"
            
        try:
            # Configure for TTS-only: voice selection and system instruction
            config = {
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {
                            "voice_name": voice_id or "Puck"
                        }
                    }
                },
                "system_instruction": "You are a text-to-speech engine. Read the user's text exactly as provided, without adding any commentary or response. Just speak the text."
            }
            
            # Yield WAV Header first (24kHz, 1ch, 16bit)
            yield create_wav_header(sample_rate=24000, channels=1, bits_per_sample=16)
            
            async with self.client.aio.live.connect(model=model, config=config) as session:
                # Send explicit TTS instruction
                tts_prompt = f"Please read this text aloud: {text}"
                await session.send(input=tts_prompt, end_of_turn=True)
                
                async for response in session.receive():
                    # Check for audio data in parts
                    if response.server_content and response.server_content.model_turn:
                        for part in response.server_content.model_turn.parts:
                            if part.inline_data:
                                yield part.inline_data.data
                    
                    # Stop if turn is complete
                    if response.server_content and response.server_content.turn_complete:
                        break
                        
        except Exception as e:
            logger.error(f"Google TTS Error: {e}")
            raise

    async def stt(self, audio_data: bytes, model: str = None) -> str:
        if not model:
             model = settings.GEMINI_VOICE_MODEL_NAME
        if not self.client:
            raise ValueError("Google Client not ready.")
        
        # Gemini Multimodal STT
        # We need to wrap bytes in types.Part or dict
        encoded_audio = types.Part.from_bytes(data=audio_data, mime_type="audio/webm") # Assuming webm from frontend
        
        response = self.client.models.generate_content(
            model=model,
            contents=[
                encoded_audio,
                "Transcribe this audio exactly. Output only the transcription."
            ]
        )
        return response.text

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError("Google does not support pronunciation assessment yet.")

class ElevenLabsProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.client = None
        if self.api_key and ElevenLabs:
            self.client = ElevenLabs(api_key=self.api_key)

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_turbo_v2", "eleven_flash_v2_5", "eleven_flash_v2"],
            "voices": [
                {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
                {"id": "29vD33N1CtxCmqQRPOHJ", "name": "Drew"},
                {"id": "2EiwWnXFnvU5JabPnv8n", "name": "Clyde"},
                {"id": "zrHiDhphv9ZnVXBqCLjf", "name": "Mimi"},
                {"id": "D38z5RcWu1voky8WS1ja", "name": "Fin"},
                {"id": "cgSgspJ2msm6clMCkdW9", "name": "Jessica"},
                {"id": "iP95p4xoKVk53GoZ742B", "name": "Chris"},
                {"id": "pFZP5JQG7iQjIQuC4Bku", "name": "Lily"},
                {"id": "nPczCjz8fI2SgwMYtF60", "name": "Daniel"}
            ]
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.client:
            raise ValueError("ElevenLabs API Key missing.")
        
        # Handle default model - use a valid ElevenLabs model
        if model == "default" or not model:
            model = "eleven_multilingual_v2"
        
        # Handle voice_id if passed as dict from config
        actual_voice_id = voice_id["id"] if isinstance(voice_id, dict) else voice_id

        try:
            # ElevenLabs SDK v3+ stream method
            # We explicitly request mp3_44100_128 for good balance of quality and size
            audio_stream = self.client.text_to_speech.stream(
                text=text,
                voice_id=actual_voice_id,
                model_id=model,
                output_format="mp3_44100_128"
            )
            
            # The SDK returns a generator of bytes
            for chunk in audio_stream:
                if chunk:
                    yield chunk
                    
        except Exception as e:
            logger.error(f"ElevenLabs TTS Error: {e}")
            raise

    async def stt(self, audio_data: bytes, model: str = "scribe_v1") -> str:
        if not self.client:
            raise ValueError("ElevenLabs API Key missing.")
            
        try:
            # ElevenLabs STT (Scribe)
            # Requires a file-like object with a name
            import io
            # We wrap the bytes in BytesIO and give it a name so the SDK can guess/handle format
            audio_file = io.BytesIO(audio_data)
            audio_file.name = "audio.mp3" # Naming it .mp3 is usually safe, or .wav
            
            # Calling the convert method
            response = self.client.speech_to_text.convert(
                file=audio_file,
                model_id="scribe_v1", # Scribe v1 is the current STT model
                tag_audio_events=False # Simplified text output
            )
            
            if response and response.text:
                return response.text
            return ""
            
        except Exception as e:
            logger.error(f"ElevenLabs STT Error: {e}")
            raise

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError("ElevenLabs does not support pronunciation assessment.")

    async def text_to_sfx(self, text: str, duration_seconds: Optional[float] = None, prompt_influence: float = 0.3) -> AsyncGenerator[bytes, None]:
        if not self.client:
            raise ValueError("ElevenLabs API Key missing.")
        
        try:
            # ElevenLabs Text to Sound Effects
            # Returns a generator of bytes (audio/mpeg)
            result = self.client.text_to_sound_effects.convert(
                text=text,
                duration_seconds=duration_seconds,
                prompt_influence=prompt_influence
            )
            
            # If it returns bytes directly (some SDK versions):
            if isinstance(result, bytes):
                 yield result
            else:
                 # If it is iterator
                 for chunk in result:
                     if chunk:
                         yield chunk
                         
        except Exception as e:
            logger.error(f"ElevenLabs SFX Error: {e}")
            raise

    async def speech_to_speech(self, audio_data: bytes, voice_id: str, model_id: str = "eleven_english_sts_v2") -> AsyncGenerator[bytes, None]:
        if not self.client:
            raise ValueError("ElevenLabs API Key missing.")
            
        try:
             # ElevenLabs Voice Changer
             # Need to handle audio data input. SDK expects a file-like object or path?
             # Based on docs/SDK usage, convert usually takes 'audio' as file-like.
             import io
             audio_file = io.BytesIO(audio_data)
             audio_file.name = "input_audio.mp3" # Or wav, SDK should handle detection
             
             # Handle voice_id if passed as dict
             actual_voice_id = voice_id["id"] if isinstance(voice_id, dict) else voice_id

             # Returns generator
             result = self.client.speech_to_speech.convert(
                 voice_id=actual_voice_id,
                 audio=audio_file,
                 model_id=model_id,
                 output_format="mp3_44100_128"
             )

             if isinstance(result, bytes):
                 yield result
             else:
                 for chunk in result:
                     if chunk:
                         yield chunk

        except Exception as e:
            logger.error(f"ElevenLabs STS Error: {e}")
            raise

class DeepgramProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.client = None
        if self.api_key and DeepgramClient:
            self.client = DeepgramClient(api_key=self.api_key)

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["nova-3", "nova-2", "nova-2-general", "nova-2-meeting"],  # STT models
            "voices": [
                # English (US)
                "aura-asteria-en", "aura-luna-en", "aura-stella-en", "aura-athena-en",
                "aura-hera-en", "aura-orion-en", "aura-arcas-en", "aura-perseus-en",
                "aura-angus-en", "aura-orpheus-en", "aura-helios-en", "aura-zeus-en",
                # English (UK)
                "aura-toulouse-en",
                # 2.0 Voices (Higher fidelity)
                "aura-2-asteria-en", "aura-2-luna-en", "aura-2-stella-en", "aura-2-athena-en"
            ]
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.client:
             raise ValueError("Deepgram API Key missing.")
        
        # In Deepgram TTS, 'model' usually refers to the voice name itself.
        # But if 'voice_id' is provided, we use that.
        voice_model = voice_id if voice_id else "aura-asteria-en"
        
        # Deepgram TTS SDK v5.3.0
        # We explicitly request MP3 or Linear16. Let's use MP3 for bandwidth efficiency 
        # unless specifically needed otherwise.
        # However, for highest compatibility with standard players, MP3 is safe.
        try:
            options = {
                "text": text,
                "model": voice_model,
                "encoding": "mp3", # Explicit encoding
            }
            
            response = self.client.speak.v1.audio.generate(**options)
            
            # response is a generator in v5
            for chunk in response:
                if isinstance(chunk, bytes) and chunk:
                    yield chunk 
        except Exception as e:
            logger.error(f"Deepgram TTS Error: {e}")
            raise

    async def stt(self, audio_data: bytes, model: str = "nova-3") -> str:
        if not self.client:
             raise ValueError("Deepgram API Key missing.")
        
        # Deepgram STT SDK v5.3.0
        try:
            # Construct options with robust default checking
            options = {
                "model": model or "nova-3",
                "smart_format": True,
                "punctuate": True, 
                "utterances": True, # Useful for segmentation if needed later
                "language": "en-US"
            }
            
            # Detect mimetype if possible, or default to general audio handling
            # The SDK handles raw bytes well if we just pass them directly.
            
            # Original code used 'request' with raw bytes and worked.
            response = self.client.listen.v1.media.transcribe_file(
                request=audio_data, 
                **options
            )
            
            # Robustly extract transcript
            if (response.results and 
                response.results.channels and 
                response.results.channels[0].alternatives and 
                response.results.channels[0].alternatives[0].transcript):
                return response.results.channels[0].alternatives[0].transcript
            
            return ""
            
        except Exception as e:
            logger.error(f"Deepgram STT Error: {e}")
            raise

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError("Deepgram does not support pronunciation assessment yet.")


class VoiceLabService:
    def __init__(self):
        self.providers = {
            "google": GoogleProvider(),
            "elevenlabs": ElevenLabsProvider(),
            "deepgram": DeepgramProvider()
        }
    
    def get_provider(self, name: str) -> VoiceProvider:
        return self.providers.get(name, MockProvider())

    def get_all_configs(self):
        return {name: p.get_config() for name, p in self.providers.items()}

voice_lab_service = VoiceLabService()
