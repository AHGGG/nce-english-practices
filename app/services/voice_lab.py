
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
            "models": ["eleven_multilingual_v2", "eleven_turbo_v2_5", "eleven_turbo_v2"],
            "voices": [
                {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
                {"id": "29vD33N1CtxCmqQRPOHJ", "name": "Drew"},
                {"id": "2EiwWnXFnvU5JabPnv8n", "name": "Clyde"},
                {"id": "zrHiDhphv9ZnVXBqCLjf", "name": "Mimi"},
                {"id": "D38z5RcWu1voky8WS1ja", "name": "Fin"}
            ]
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.client:
            raise ValueError("ElevenLabs API Key missing.")
        
        # Handle default model - use a valid ElevenLabs model
        if model == "default" or not model:
            model = "eleven_multilingual_v2"
        
        # ElevenLabs SDK v3+ change: .convert returns a generator
        audio_stream = self.client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id=model
        )
        
        # If it returns bytes directly:
        if isinstance(audio_stream, bytes):
             yield audio_stream
        else:
             # If it is iterator
             for chunk in audio_stream:
                 if chunk:
                     yield chunk

    async def stt(self, audio_data: bytes, model: str = "general") -> str:
        raise NotImplementedError("ElevenLabs does not support STT yet.")

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError("ElevenLabs does not support pronunciation assessment.")

class DeepgramProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.client = None
        if self.api_key and DeepgramClient:
            self.client = DeepgramClient(api_key=self.api_key)

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["nova-3", "nova-2"],  # STT models - nova-3 is latest
            "voices": ["aura-2-asteria-en", "aura-2-luna-en", "aura-2-stella-en", "aura-2-athena-en"]  # Aura 2 TTS voices
        }

    async def tts(self, text: str, voice_id: str, model: str) -> AsyncGenerator[bytes, None]:
        if not self.client:
             raise ValueError("Deepgram API Key missing.")
        
        # Handle default model - use a valid Deepgram Aura voice
        # For Deepgram TTS, the 'model' parameter IS the voice name
        if model == "default" or not model:
            model = voice_id if voice_id else "aura-2-asteria-en"
        
        # Deepgram TTS SDK v5.3.0 - speak.v1.audio.generate() returns a generator
        response = self.client.speak.v1.audio.generate(
            text=text,
            model=model
        )
        
        # Response is a generator of bytes chunks - yield each one
        for chunk in response:
            if isinstance(chunk, bytes) and chunk:
                yield chunk 

    async def stt(self, audio_data: bytes, model: str = "nova-3") -> str:
        if not self.client:
             raise ValueError("Deepgram API Key missing.")
        
        # Deepgram STT SDK v5.3.0 - use listen.v1.media.transcribe_file
        # Pass options as keyword arguments, not a class
        response = self.client.listen.v1.media.transcribe_file(
            request=audio_data,
            model=model,
            smart_format=True
        )
        return response.results.channels[0].alternatives[0].transcript

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError("Deepgram does not support pronunciation assessment yet.")


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
             details = result.cancellation_details
             logger.error(f"Azure TTS Error: {details.reason}. Details: {details.error_details}")

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

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        if not self.config:
            raise ValueError("Azure Speech Key/Region missing.")

        # Create Pronunciation Assessment Config
        # We assume standard American English for now, or use voice_id logic if we had it.
        pronunciation_config = speechsdk.PronunciationAssessmentConfig(
            reference_text=reference_text,
            grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
            granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
            enable_miscue=True
        )

        # Stream Setup
        stream = speechsdk.audio.PushAudioInputStream()
        audio_config = speechsdk.audio.AudioConfig(stream=stream)
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=self.config, audio_config=audio_config)
        
        # Apply config
        pronunciation_config.apply_to(speech_recognizer)

        # Write data
        stream.write(audio_data)
        stream.close()

        # Execute
        result = await asyncio.to_thread(speech_recognizer.recognize_once_async().get)

        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            # Parse Detailed Results
            pronunciation_result = speechsdk.PronunciationAssessmentResult(result)
            
            # Helper to extract words
            # The full JSON result has phoneme level details.
            # result.properties[speechsdk.PropertyId.SpeechServiceResponse_JsonResult]
            json_result = result.properties.get(speechsdk.PropertyId.SpeechServiceResponse_JsonResult)
            parsed_json = json.loads(json_result) if json_result else {}
            
            # Basic Scores
            response = {
                "accuracy": pronunciation_result.accuracy_score,
                "fluency": pronunciation_result.fluency_score,
                "completeness": pronunciation_result.completeness_score,
                "pronunciation": pronunciation_result.pronunciation_score,
                "words": [] # We can populate detailed word list from parsed_json
            }
            
            # Extract detailed word info if available
            # Current Azure JSON structure usually has NBest -> [0] -> Words
            if "NBest" in parsed_json and len(parsed_json["NBest"]) > 0:
                words_data = parsed_json["NBest"][0].get("Words", [])
                response["words"] = words_data
                
            return response

        elif result.reason == speechsdk.ResultReason.NoMatch:
             return {"error": "No speech recognized."}
        elif result.reason == speechsdk.ResultReason.Canceled:
             details = result.cancellation_details
             return {"error": f"Canceled: {details.reason}", "details": details.error_details}
        
        return {"error": "Unknown error during assessment."}

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
