
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
    import azure.cognitiveservices.speech as speechsdk
except ImportError:
    speechsdk = None

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

# --- Implementations ---

class MockProvider(VoiceProvider):
    """Fallback provider for testing without keys."""
    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        yield b"mock_audio_data"
    
    async def stt(self, audio_data: bytes, model: str = "general") -> str:
        return "This is a mock transcription."

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["mock-v1"],
            "voices": ["mock-male", "mock-female"]
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
             self.client = genai.Client(api_key=self.api_key)

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["gemini-2.0-flash-exp"],
            "voices": ["Puck", "Charon", "Kore", "Fenrir", "Aoede"] # Standard Gemini voices
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.client:
            raise ValueError("Google GenAI Client not initialized (Missing Key or SDK).")
        
        # Use Gemini Multimodal Generation for TTS
        # Reference: https://ai.google.dev/gemini-api/docs/speech-synthesis
        
        # Set default model if generic 'model' passed
        if model == "default" or not model:
            model = "gemini-2.0-flash-exp"
            
        try:
            # Using specific config structure for speech synthesis
            # Note: The SDK usage might require types.GenerateContentConfig or simple dict.
            # Using dict for broader compatibility if types change.
            config = {
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {
                            "voice_name": voice_id
                        }
                    }
                }
            }
            
            response = self.client.models.generate_content(
                model=model,
                contents=text,
                config=config
            )
            
            # The response contains parts with inline_data (bytes)
            # It might be a single response or stream (if stream=True)
            # For simplicity in this first pass, we use non-streaming call then yield chunks,
            # unless we implement stream=True and iterate.
            # Docs say: "The response contains audio data in the parts list."
            
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                         yield part.inline_data.data
        except Exception as e:
            logger.error(f"Google TTS Error: {e}")
            raise

    async def stt(self, audio_data: bytes, model: str = "gemini-2.0-flash-exp") -> str:
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

class ElevenLabsProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.client = None
        if self.api_key and ElevenLabs:
            self.client = ElevenLabs(api_key=self.api_key)

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["eleven_monolingual_v1", "eleven_multilingual_v2", "eleven_turbo_v2"],
            "voices": ["Rachel", "Drew", "Clyde", "Mimi", "Fin"] # Simplified list
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.client:
            raise ValueError("ElevenLabs API Key missing.")
        
        # Streaming response
        audio_stream = self.client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=model,
            stream=True
        )
        
        for chunk in audio_stream:
            if chunk:
                yield chunk

    async def stt(self, audio_data: bytes, model: str = "general") -> str:
        raise NotImplementedError("ElevenLabs does not support STT yet.")

class DeepgramProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.client = None
        if self.api_key and DeepgramClient:
            self.client = DeepgramClient(self.api_key)

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["nova-2", "enhanced"],
            "voices": ["aura-asteria-en", "aura-luna-en", "aura-stella-en", "aura-athena-en"] # Deepgram Aura TTS
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.client:
             raise ValueError("Deepgram API Key missing.")
        
        # Deepgram TTS (Aura) via SDK v3
        options = {"text": text}
        # model param for Aura is used inside options or just model? 
        # Checking docs: speak.v1.audio.generate({"text": ...}, {"model": "aura-..."})
        model_options = {"model": voice_id} 
        
        response = self.client.speak.v1.audio.generate(
            options,
            model_options
        )
        
        # Response typically wraps binary or stream. 
        # Assuming we can inspect it or it has a stream property.
        # Based on inspection, we saw `stream` method wasn't there but `generate` was.
        # Let's try standardized access.
        if hasattr(response, 'stream'):
             # If strictly streaming response
             yield response.stream.read()
        else:
             # If raw bytes in body or similar
             # V3 might return a response object where .read() gives bytes?
             # Or it returns a simple structure. 
             # Safe bet: response itself might be bytes if raw requested, but we didn't ask raw.
             # We saw `with_raw_response` as alternative.
             # Let's assume response.stream is the standard for audio.
             yield response.stream.read() 

    async def stt(self, audio_data: bytes, model: str = "nova-2") -> str:
        if not self.client:
             raise ValueError("Deepgram API Key missing.")
        
        # Deepgram STT (Nova-2) via SDK v3
        payload = {"buffer": audio_data, "mimetype": "audio/webm"}
        options = {"model": model, "smart_format": True}
        
        response = self.client.listen.v1.media.transcribe_file(
            payload, 
            options
        )
        return response.results.channels[0].alternatives[0].transcript


class AzureProvider(VoiceProvider):
    def __init__(self):
        self.key = settings.AZURE_SPEECH_KEY
        self.region = settings.AZURE_SPEECH_REGION
        self.config = None
        if self.key and speechsdk:
            self.config = speechsdk.SpeechConfig(subscription=self.key, region=self.region)

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["standard"],
            "voices": ["en-US-AvaMultilingualNeural", "en-US-AndrewMultilingualNeural", "en-US-EmmaMultilingualNeural"]
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.config:
            raise ValueError("Azure Speech Key/Region missing.")
        
        self.config.speech_synthesis_voice_name = voice_id
        # Null output to prevent playback on server
        audio_config = speechsdk.audio.AudioOutputConfig(use_default_speaker=False, filename=None)
        
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=self.config, audio_config=audio_config)
        
        # Blocking call, run in thread if heavy, but for now simple wrapper
        # Azure SDK is tricky for streaming bytes back to python directly without file.
        # PullAudioOutputStream is the way.
        
        stream_callback = PushAudioOutputStreamCallback()
        audio_stream = speechsdk.audio.PushAudioOutputStream(stream_callback)
        audio_config_stream = speechsdk.audio.AudioOutputConfig(stream=audio_stream)
        
        synthesizer_stream = speechsdk.SpeechSynthesizer(speech_config=self.config, audio_config=audio_config_stream)
        result = synthesizer_stream.speak_text_async(text).get() # Blocking helper
        
        # Simply returning bytes for now (non-streaming for Azure simpler implementation)
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
             yield result.audio_data
        else:
             logger.error(f"Azure TTS Error: {result.cancellation_details.reason}")

    async def stt(self, audio_data: bytes, model: str = "general") -> str:
        if not self.config:
            raise ValueError("Azure Speech Key/Region missing.")

        # Use PushAudioInputStream to handle in-memory audio bytes
        stream = speechsdk.audio.PushAudioInputStream()
        audio_config = speechsdk.audio.AudioConfig(stream=stream)
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=self.config, audio_config=audio_config)
        
        # Write bytes and close stream
        stream.write(audio_data)
        stream.close()
        
        # Run recognition in thread to avoid blocking async event loop
        # recognize_once_async returns a future, .get() blocks until result
        result = await asyncio.to_thread(speech_recognizer.recognize_once_async().get)
        
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            return result.text
        elif result.reason == speechsdk.ResultReason.NoMatch:
             return "No speech could be recognized."
        elif result.reason == speechsdk.ResultReason.Canceled:
             details = result.cancellation_details
             return f"Canceled: {details.reason}. Error: {details.error_details}"
        
        return ""

# Helper for Azure Stream if needed
if speechsdk:
    class PushAudioOutputStreamCallback(speechsdk.audio.PushAudioOutputStreamCallback):
        def __init__(self):
            super().__init__()
            self._audio_data = bytearray()
        
        def write(self, data: memoryview) -> int:
            self._audio_data.extend(data)
            return data.nbytes
            
        def close(self):
            pass

class VoiceLabService:
    def __init__(self):
        self.providers = {
            "google": GoogleProvider(),
            "elevenlabs": ElevenLabsProvider(),
            "deepgram": DeepgramProvider(),
            "azure": AzureProvider()
        }
    
    def get_provider(self, name: str) -> VoiceProvider:
        return self.providers.get(name, MockProvider())

    def get_all_configs(self):
        return {name: p.get_config() for name, p in self.providers.items()}

voice_lab_service = VoiceLabService()
