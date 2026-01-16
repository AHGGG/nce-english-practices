from fastapi import APIRouter

from .live_stt import deepgram_live_stt_websocket
from .streaming_tts import deepgram_streaming_tts_websocket
from .voice_agent import deepgram_voice_agent_websocket
from .unified_agent import deepgram_unified_voice_agent_websocket

router = APIRouter(prefix="/api/voice-lab/deepgram", tags=["deepgram-websocket"])

router.add_api_websocket_route("/live-stt", deepgram_live_stt_websocket)
router.add_api_websocket_route("/streaming-tts", deepgram_streaming_tts_websocket)
router.add_api_websocket_route("/voice-agent", deepgram_voice_agent_websocket)
router.add_api_websocket_route(
    "/unified-voice-agent", deepgram_unified_voice_agent_websocket
)
