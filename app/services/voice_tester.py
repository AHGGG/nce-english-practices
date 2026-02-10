import logging
from typing import Optional
from difflib import SequenceMatcher
from dataclasses import dataclass
import time

from app.services.voice_lab import get_voice_lab_service

# Setup Logger
logger = logging.getLogger(__name__)


@dataclass
class TestResult:
    passed: bool
    score: float
    latency_ms: float
    transcript: str
    expected: str
    error: Optional[str] = None


class VoiceTester:
    def _calculate_similarity(self, a: str, b: str) -> float:
        """Returns similarity score between 0.0 and 1.0"""
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()

    async def evaluate_tts(
        self,
        tts_provider_name: str,
        tts_model: str,
        text: str,
        voice_id: str = None,
        stt_judge_name: str = "deepgram",
        stt_judge_model: str = "nova-3",
    ) -> TestResult:
        """
        Verifies TTS quality by generating audio and transcribing it with a high-quality STT judge.
        """
        start_time = time.time()
        try:
            tts_provider = get_voice_lab_service().get_provider(tts_provider_name)
            stt_judge = get_voice_lab_service().get_provider(stt_judge_name)

            # 1. Generate Audio

            audio_chunks = []
            async for chunk in tts_provider.tts(text, voice_id, tts_model):
                audio_chunks.append(chunk)
            full_audio = b"".join(audio_chunks)

            if len(full_audio) == 0:
                return TestResult(
                    False,
                    0.0,
                    (time.time() - start_time) * 1000,
                    "",
                    text,
                    "No audio generated",
                )

            # 2. Transcribe Audio (Judge)
            transcript = await stt_judge.stt(full_audio, model=stt_judge_model)

            # 3. Compare
            score = self._calculate_similarity(text, transcript)
            passed = score > 0.85  # Threshold

            return TestResult(
                passed=passed,
                score=score,
                latency_ms=(time.time() - start_time) * 1000,
                transcript=transcript,
                expected=text,
            )

        except Exception as e:
            logger.error(f"TTS Test Error: {e}")
            return TestResult(
                False, 0.0, (time.time() - start_time) * 1000, "", text, str(e)
            )

    async def evaluate_stt(
        self,
        stt_provider_name: str,
        stt_model: str,
        text: str,
        reference_audio: bytes = None,
        tts_ref_name: str = "elevenlabs",
        tts_ref_voice: str = "21m00Tcm4TlvDq8ikWAM",  # Rachel
        tts_ref_model: str = "eleven_turbo_v2",
    ) -> TestResult:
        """
        Verifies STT quality by transcribing reference audio (generated or provided).
        """
        start_time = time.time()
        try:
            stt_provider = get_voice_lab_service().get_provider(stt_provider_name)

            # 1. Get Reference Audio
            audio_data = reference_audio
            if not audio_data:
                # Generate integrity reference
                tts_ref = get_voice_lab_service().get_provider(tts_ref_name)
                chunks = []
                async for chunk in tts_ref.tts(text, tts_ref_voice, tts_ref_model):
                    chunks.append(chunk)
                audio_data = b"".join(chunks)

            # 2. Transcribe
            transcript = await stt_provider.stt(audio_data, model=stt_model)

            # 3. Compare
            score = self._calculate_similarity(text, transcript)
            passed = score > 0.80  # Slightly lower threshold for STT

            return TestResult(
                passed=passed,
                score=score,
                latency_ms=(time.time() - start_time) * 1000,
                transcript=transcript,
                expected=text,
            )

        except Exception as e:
            logger.error(f"STT Test Error: {e}")
            return TestResult(
                False, 0.0, (time.time() - start_time) * 1000, "", text, str(e)
            )

    async def evaluate_sts(
        self,
        sts_provider_name: str,
        voice_id: str,  # Target voice
        text: str,
        tts_ref_name: str = "elevenlabs",
        stt_judge_name: str = "deepgram",
    ) -> TestResult:
        """
        Verifies Speech-to-Speech integrity:
        Text -> Reference TTS (Source Voice) -> STS (Target Voice) -> STT Judge -> Text
        """
        start_time = time.time()
        try:
            sts_provider = get_voice_lab_service().get_provider(sts_provider_name)
            tts_ref = get_voice_lab_service().get_provider(tts_ref_name)
            stt_judge = get_voice_lab_service().get_provider(stt_judge_name)

            # 1. Generate Source Audio (Reference)
            source_chunks = []
            # Using a distinct source voice (e.g. Rachel)
            async for chunk in tts_ref.tts(
                text, "21m00Tcm4TlvDq8ikWAM", "eleven_turbo_v2_5"
            ):
                source_chunks.append(chunk)
            source_audio = b"".join(source_chunks)

            # 2. Convert Audio (STS)
            target_chunks = []
            async for chunk in sts_provider.speech_to_speech(source_audio, voice_id):
                target_chunks.append(chunk)
            target_audio = b"".join(target_chunks)

            if len(target_audio) == 0:
                return TestResult(
                    False,
                    0.0,
                    (time.time() - start_time) * 1000,
                    "",
                    text,
                    "No STS audio generated",
                )

            # 3. Transcribe Output (Judge)
            transcript = await stt_judge.stt(target_audio)

            # 4. Compare (Semantic Integrity check)
            score = self._calculate_similarity(text, transcript)
            passed = score > 0.75  # Lower threshold as two conversions occurred

            return TestResult(
                passed=passed,
                score=score,
                latency_ms=(time.time() - start_time) * 1000,
                transcript=transcript,
                expected=text,
            )

        except Exception as e:
            logger.error(f"STS Test Error: {e}")
            return TestResult(
                False, 0.0, (time.time() - start_time) * 1000, "", text, str(e)
            )


voice_tester = VoiceTester()
