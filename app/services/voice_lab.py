import abc
import os
import logging
from typing import AsyncGenerator, Optional, Dict, Any

from app.config import settings

from fastapi.concurrency import run_in_threadpool
from starlette.concurrency import iterate_in_threadpool

# Setup Logger
logger = logging.getLogger(__name__)

# --- Optional Imports to prevent crash if installation issues ---

# --- Optional Imports to prevent crash if installation issues ---
# Note: ElevenLabs SDK removed. We use raw httpx.

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

# Note: Deepgram SDK removed. We use raw httpx/websockets.

# --- Base Class ---


class VoiceProvider(abc.ABC):
    @abc.abstractmethod
    async def tts(
        self, text: str, voice_id: str, model: str
    ) -> AsyncGenerator[bytes, None]:
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


def create_wav_header(
    sample_rate=24000, channels=1, bits_per_sample=16, data_size=0xFFFFFFF
):
    """
    Create a RIFF/WAVE header for streaming raw PCM audio.
    Using a large data_size placeholder since we are streaming.
    """
    # 44 bytes header
    import struct

    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8

    # RIFF chunk
    header = b"RIFF"
    header += struct.pack("<I", 36 + data_size)  # ChunkSize (36 + SubChunk2Size)
    header += b"WAVE"

    # fmt sub-chunk
    header += b"fmt "
    header += struct.pack("<I", 16)  # SubChunk1Size (16 for PCM)
    header += struct.pack("<H", 1)  # AudioFormat (1 for PCM)
    header += struct.pack("<H", channels)
    header += struct.pack("<I", sample_rate)
    header += struct.pack("<I", byte_rate)
    header += struct.pack("<H", block_align)
    header += struct.pack("<H", bits_per_sample)

    # data sub-chunk
    header += b"data"
    header += struct.pack("<I", data_size)

    return header


# --- Implementations ---


class MockProvider(VoiceProvider):
    """Fallback provider for testing without keys."""

    async def tts(
        self, text: str, voice_id: str, model: str
    ) -> AsyncGenerator[bytes, None]:
        yield b"mock_audio_data"

    async def stt(self, audio_data: bytes, model: str = "general") -> str:
        return "This is a mock transcription."

    def get_config(self) -> Dict[str, Any]:
        return {"voices": ["mock-male", "mock-female"]}

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        return {
            "accuracy": 95.0,
            "fluency": 90.0,
            "completeness": 100.0,
            "pronunciation": 92.0,
            "words": [],
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
            # v1beta required for Live API with stable models
            self.client = genai.Client(
                api_key=self.api_key, http_options={"api_version": "v1beta"}
            )

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["gemini-2.5-flash-native-audio-latest", "gemini-2.0-flash"],
            "voices": [
                "Puck",
                "Charon",
                "Kore",
                "Fenrir",
                "Aoede",
            ],  # Standard Gemini voices
        }

    async def tts(
        self, text: str, voice_id: str, model: str
    ) -> AsyncGenerator[bytes, None]:
        if not self.client:
            raise ValueError(
                "Google GenAI Client not initialized (Missing Key or SDK)."
            )

        # Use Gemini Live API for Native Audio Generation

        # Set default model if generic 'model' passed
        if model == "default" or not model:
            model = "gemini-2.5-flash-native-audio-latest"  # Align with config.py

        try:
            # Handle "default" voice_id from frontend
            # The API rejects "default" as a voice name.
            actual_voice = voice_id
            if not actual_voice or actual_voice == "default":
                actual_voice = "Puck"

            # Configure for TTS-only: voice selection and system instruction
            config = {
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {"voice_name": actual_voice}
                    }
                },
                "system_instruction": "You are a text-to-speech engine. Read the user's text exactly as provided, without adding any commentary or response. Just speak the text.",
            }

            # Yield WAV Header first (24kHz, 1ch, 16bit)
            yield create_wav_header(sample_rate=24000, channels=1, bits_per_sample=16)

            async with self.client.aio.live.connect(
                model=model, config=config
            ) as session:
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
                    if (
                        response.server_content
                        and response.server_content.turn_complete
                    ):
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
        encoded_audio = types.Part.from_bytes(
            data=audio_data, mime_type="audio/webm"
        )  # Assuming webm from frontend

        response = self.client.models.generate_content(
            model=model,
            contents=[
                encoded_audio,
                "Transcribe this audio exactly. Output only the transcription.",
            ],
        )
        return response.text

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError(
            "Google does not support pronunciation assessment yet."
        )


class ElevenLabsProvider(VoiceProvider):
    """ElevenLabs provider using raw HTTP API (no SDK)."""

    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.base_url = "https://api.elevenlabs.io/v1"

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": [
                "eleven_multilingual_v2",
                "eleven_turbo_v2_5",
                "eleven_turbo_v2",
                "eleven_flash_v2_5",
                "eleven_flash_v2",
            ],
            "voices": [
                {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel"},
                {"id": "29vD33N1CtxCmqQRPOHJ", "name": "Drew"},
                {"id": "2EiwWnXFnvU5JabPnv8n", "name": "Clyde"},
                {"id": "zrHiDhphv9ZnVXBqCLjf", "name": "Mimi"},
                {"id": "D38z5RcWu1voky8WS1ja", "name": "Fin"},
                {"id": "cgSgspJ2msm6clMCkdW9", "name": "Jessica"},
                {"id": "iP95p4xoKVk53GoZ742B", "name": "Chris"},
                {"id": "pFZP5JQG7iQjIQuC4Bku", "name": "Lily"},
                {"id": "nPczCjz8fI2SgwMYtF60", "name": "Daniel"},
            ],
        }

    async def tts(
        self, text: str, voice_id: str, model: str
    ) -> AsyncGenerator[bytes, None]:
        """
        ElevenLabs TTS using raw HTTP API.
        POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128
        """
        if not self.api_key:
            raise ValueError("ElevenLabs API Key missing.")

        # Handle default model
        if model == "default" or not model:
            model = "eleven_multilingual_v2"

        # Handle voice_id if passed as dict from config
        actual_voice_id = voice_id["id"] if isinstance(voice_id, dict) else voice_id

        import httpx

        url = f"{self.base_url}/text-to-speech/{actual_voice_id}?output_format=mp3_44100_128"
        headers = {"xi-api-key": self.api_key, "Content-Type": "application/json"}
        payload = {"text": text, "model_id": model}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST", url, headers=headers, json=payload
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise Exception(
                            f"ElevenLabs TTS Failed ({response.status_code}): {error_text.decode()}"
                        )

                    async for chunk in response.aiter_bytes():
                        if chunk:
                            yield chunk

        except Exception as e:
            logger.error(f"ElevenLabs TTS Error: {e}")
            raise

    async def stt(self, audio_data: bytes, model: str = "scribe_v1") -> str:
        """
        ElevenLabs STT (Scribe) using raw HTTP API.
        POST https://api.elevenlabs.io/v1/speech-to-text (multipart/form-data)
        """
        if not self.api_key:
            raise ValueError("ElevenLabs API Key missing.")

        import httpx

        url = f"{self.base_url}/speech-to-text"
        headers = {"xi-api-key": self.api_key}

        # Multipart form data
        files = {"file": ("audio.mp3", audio_data, "audio/mpeg")}
        data = {"model_id": "scribe_v1", "tag_audio_events": "false"}

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    url, headers=headers, files=files, data=data
                )

                if response.status_code != 200:
                    raise Exception(
                        f"ElevenLabs STT Failed ({response.status_code}): {response.text}"
                    )

                result = response.json()

                # Response can be SpeechToTextChunkResponseModel with 'text' field
                if "text" in result:
                    return result["text"]
                return ""

        except Exception as e:
            logger.error(f"ElevenLabs STT Error: {e}")
            raise

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError(
            "ElevenLabs does not support pronunciation assessment."
        )

    async def text_to_sfx(
        self,
        text: str,
        duration_seconds: Optional[float] = None,
        prompt_influence: float = 0.3,
    ) -> AsyncGenerator[bytes, None]:
        """
        ElevenLabs Text to Sound Effects using raw HTTP API.
        POST https://api.elevenlabs.io/v1/sound-generation
        """
        if not self.api_key:
            raise ValueError("ElevenLabs API Key missing.")

        import httpx

        url = f"{self.base_url}/sound-generation?output_format=mp3_44100_128"
        headers = {"xi-api-key": self.api_key, "Content-Type": "application/json"}
        payload = {"text": text, "prompt_influence": prompt_influence}
        if duration_seconds is not None:
            payload["duration_seconds"] = duration_seconds

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST", url, headers=headers, json=payload
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise Exception(
                            f"ElevenLabs SFX Failed ({response.status_code}): {error_text.decode()}"
                        )

                    async for chunk in response.aiter_bytes():
                        if chunk:
                            yield chunk

        except Exception as e:
            logger.error(f"ElevenLabs SFX Error: {e}")
            raise

    async def speech_to_speech(
        self, audio_data: bytes, voice_id: str, model_id: str = "eleven_english_sts_v2"
    ) -> AsyncGenerator[bytes, None]:
        """
        ElevenLabs Voice Changer using raw HTTP API.
        POST https://api.elevenlabs.io/v1/speech-to-speech/{voice_id} (multipart/form-data)
        """
        if not self.api_key:
            raise ValueError("ElevenLabs API Key missing.")

        import httpx

        # Handle voice_id if passed as dict
        actual_voice_id = voice_id["id"] if isinstance(voice_id, dict) else voice_id

        url = f"{self.base_url}/speech-to-speech/{actual_voice_id}?output_format=mp3_44100_128"
        headers = {"xi-api-key": self.api_key}

        # Multipart form data
        files = {"audio": ("input_audio.mp3", audio_data, "audio/mpeg")}
        data = {"model_id": model_id}

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST", url, headers=headers, files=files, data=data
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise Exception(
                            f"ElevenLabs STS Failed ({response.status_code}): {error_text.decode()}"
                        )

                    async for chunk in response.aiter_bytes():
                        if chunk:
                            yield chunk

        except Exception as e:
            logger.error(f"ElevenLabs STS Error: {e}")
            raise


class DeepgramProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": [
                "nova-3",
                "nova-2",
                "nova-2-general",
                "nova-2-meeting",
            ],  # STT models
            "voices": [
                # English (US)
                "aura-asteria-en",
                "aura-luna-en",
                "aura-stella-en",
                "aura-athena-en",
                "aura-hera-en",
                "aura-orion-en",
                "aura-arcas-en",
                "aura-perseus-en",
                "aura-angus-en",
                "aura-orpheus-en",
                "aura-helios-en",
                "aura-zeus-en",
                # English (UK)
                "aura-toulouse-en",
                # 2.0 Voices (Higher fidelity)
                "aura-2-asteria-en",
                "aura-2-luna-en",
                "aura-2-stella-en",
                "aura-2-athena-en",
            ],
        }

    async def tts(
        self, text: str, voice_id: str, model: str
    ) -> AsyncGenerator[bytes, None]:
        if not self.api_key:
            raise ValueError("Deepgram API Key missing.")

        import httpx

        # Determine voice model - defaults to Aura Asteria
        voice_model = voice_id if voice_id else "aura-asteria-en"

        # Deepgram TTS HTTP API
        # POST https://api.deepgram.com/v1/speak?model={model}&encoding=mp3
        # Body: {"text": "..."}
        url = f"https://api.deepgram.com/v1/speak?model={voice_model}&encoding=mp3"
        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {"text": text}

        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST", url, headers=headers, json=payload
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.read()
                        raise Exception(
                            f"Deepgram TTS Failed ({response.status_code}): {error_text.decode()}"
                        )

                    async for chunk in response.aiter_bytes():
                        if chunk:
                            yield chunk

        except Exception as e:
            logger.error(f"Deepgram TTS Error: {e}")
            raise

    async def stt(self, audio_data: bytes, model: str = "nova-3") -> str:
        if not self.api_key:
            raise ValueError("Deepgram API Key missing.")

        import httpx

        # Deepgram STT HTTP API
        # POST https://api.deepgram.com/v1/listen?model={model}&smart_format=true&punctuate=true
        # Body: Audio data (Raw or multipart)

        model_name = model or "nova-3"
        url = "https://api.deepgram.com/v1/listen"

        params = {
            "model": model_name,
            "smart_format": "true",
            "punctuate": "true",
            "utterances": "true",
            "language": "en-US",
        }

        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/octet-stream",  # Sending raw audio bytes
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    headers=headers,
                    params=params,
                    content=audio_data,
                    timeout=30.0,  # STT can take time
                )

                if response.status_code != 200:
                    raise Exception(
                        f"Deepgram STT Failed ({response.status_code}): {response.text}"
                    )

                data = response.json()

                # Extract transcript
                # Structure: results -> channels[0] -> alternatives[0] -> transcript
                if (
                    data.get("results")
                    and data["results"].get("channels")
                    and data["results"]["channels"][0].get("alternatives")
                    and data["results"]["channels"][0]["alternatives"][0].get(
                        "transcript"
                    )
                ):
                    return data["results"]["channels"][0]["alternatives"][0][
                        "transcript"
                    ]

                return ""

        except Exception as e:
            logger.error(f"Deepgram STT Error: {e}")
            raise

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError(
            "Deepgram does not support pronunciation assessment yet."
        )


class DashscopeProvider(VoiceProvider):
    """
    Alibaba Cloud Dashscope (Qwen) Provider.
    Focus on ASR using qwen3-asr inputs.
    """

    def __init__(self):
        self.api_key = settings.DASHSCOPE_API_KEY

    def get_config(self) -> Dict[str, Any]:
        return {
            "models": ["qwen3-asr-flash", "qwen3-tts-flash"],
            "voices": [
                {"id": "Cherry", "name": "Cherry (芊悦)"},
                {"id": "Ethan", "name": "Ethan (晨煦)"},
                {"id": "Nofish", "name": "Nofish (不吃鱼)"},
                {"id": "Jennifer", "name": "Jennifer (詹妮弗)"},
                {"id": "Ryan", "name": "Ryan (甜茶)"},
                {"id": "Katerina", "name": "Katerina (卡捷琳娜)"},
                {"id": "Elias", "name": "Elias (雷讲师)"},
                {"id": "Jada", "name": "Jada (上海-阿珍)"},
                {"id": "Dylan", "name": "Dylan (北京-晓东)"},
                {"id": "Sunny", "name": "Sunny (四川-晴儿)"},
                {"id": "Li", "name": "Li (南京-老李)"},
                {"id": "Marcus", "name": "Marcus (陕西-秦川)"},
                {"id": "Roy", "name": "Roy (闽南-阿杰)"},
                {"id": "Peter", "name": "Peter (天津-李彼得)"},
                {"id": "Rocky", "name": "Rocky (粤语-阿强)"},
                {"id": "Kiki", "name": "Kiki (粤语-阿清)"},
                {"id": "Eric", "name": "Eric (四川-程川)"},
            ],
        }

    async def tts(
        self, text: str, voice_id: str, model: str
    ) -> AsyncGenerator[bytes, None]:
        """
        Dashscope TTS using qwen3-tts-flash (or similar).
        Outputs raw PCM, so we wrap it in a WAV header.
        """
        if not self.api_key:
            raise ValueError("Dashscope API Key missing.")

        import dashscope
        import base64

        # Ensure we are using the correct endpoint (defaults to Beijing)
        # If user has an International key, they might need to change this,
        # but the snippet suggests trying the Beijing one (aliyuncs.com).
        dashscope.base_http_api_url = "https://dashscope.aliyuncs.com/api/v1"

        # Default model and voice
        # Ensure we don't accidentally use ASR model for TTS if passed from shared config
        if not model or model == "default" or "asr" in model:
            model = "qwen3-tts-flash"

        voice = voice_id or "Cherry"

        # Send WAV header first (24kHz, 1ch, 16bit)
        # Dashscope qwen3-tts-flash typically outputs 24000Hz PCM
        yield create_wav_header(sample_rate=24000, channels=1, bits_per_sample=16)

        try:
            # Run the synchronous Dashscope call in a thread pool
            def _get_response_iterator():
                return dashscope.MultiModalConversation.call(
                    api_key=self.api_key,
                    model=model,
                    text=text,
                    voice=voice,
                    language_type="Chinese"
                    if any("\u4e00" <= c <= "\u9fff" for c in text)
                    else "English",
                    stream=True,
                )

            response = await run_in_threadpool(_get_response_iterator)

            # Iterate over the generator in the thread pool to avoid blocking the event loop
            async for chunk in iterate_in_threadpool(response):
                if chunk.status_code != 200:
                    logger.error(
                        f"Dashscope TTS Chunk Error: {chunk.code} - {chunk.message}"
                    )
                    continue

                if chunk.output and chunk.output.audio and chunk.output.audio.data:
                    # Original snippet: base64 decode -> numpy -> bytes
                    # We can just decode base64 -> bytes
                    audio_bytes = base64.b64decode(chunk.output.audio.data)
                    yield audio_bytes

        except Exception as e:
            logger.error(f"Dashscope TTS Error: {e}")
            raise

    async def stt(self, audio_data: bytes, model: str = "qwen3-asr-flash") -> str:
        """
        Dashscope Qwen ASR.
        Uses MultiModalConversation.call
        """
        if not self.api_key:
            raise ValueError("Dashscope API Key missing.")

        import dashscope
        import tempfile

        # Ensure we are using the correct endpoint
        dashscope.base_http_api_url = "https://dashscope.aliyuncs.com/api/v1"

        # Dashscope SDK usually requires a file path for local files in 'audio' field
        # or a URL. For local files, format can be "file://..." or just path.
        # We will write bytes to a temp file.

        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        try:
            # Prepare messages
            # Note: Dashscope might require 'file://' prefix for local files depending on SDK version

            local_file_uri = f"file://{tmp_path}"

            messages = [
                {
                    "role": "system",
                    "content": [{"text": ""}],  # Context configuration as per docs
                },
                {
                    "role": "user",
                    "content": [
                        {"audio": local_file_uri},
                    ],
                },
            ]

            def _call_dashscope_asr():
                return dashscope.MultiModalConversation.call(
                    api_key=self.api_key,
                    model=model or "qwen3-asr-flash",
                    messages=messages,
                    result_format="message",
                    asr_options={"enable_lid": True, "enable_itn": False},
                )

            response = await run_in_threadpool(_call_dashscope_asr)

            if response.status_code == 200:
                # Response format:
                # {
                #   "output": {
                #     "choices": [
                #       {
                #         "message": {
                #           "content": [
                #             { "text": "..." }
                #           ],
                #           "role": "assistant"
                #         }
                #       }
                #     ]
                #   }, ...
                # }
                if (
                    response.output
                    and response.output.choices
                    and len(response.output.choices) > 0
                    and response.output.choices[0].message
                    and response.output.choices[0].message.content
                ):
                    # Content is a list of dicts or string?
                    # Qwen-audio usually returns text in content list
                    content = response.output.choices[0].message.content
                    if isinstance(content, list):
                        text_parts = [c.get("text", "") for c in content if "text" in c]
                        return " ".join(text_parts)
                    return str(content)
                return ""
            else:
                raise Exception(
                    f"Dashscope Error: {response.code} - {response.message}"
                )

        except Exception as e:
            logger.error(f"Dashscope STT Error: {e}")
            raise
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    async def assess(self, audio_data: bytes, reference_text: str) -> Dict[str, Any]:
        raise NotImplementedError(
            "Dashscope does not support pronunciation assessment."
        )


class VoiceLabService:
    def __init__(self):
        self.providers = {
            "google": GoogleProvider(),
            "elevenlabs": ElevenLabsProvider(),
            "deepgram": DeepgramProvider(),
            "dashscope": DashscopeProvider(),
        }

    def get_provider(self, name: str) -> VoiceProvider:
        return self.providers.get(name, MockProvider())

    def get_all_configs(self):
        return {name: p.get_config() for name, p in self.providers.items()}


voice_lab_service = VoiceLabService()
