
from fastapi import APIRouter, UploadFile, File, Form, WebSocket, HTTPException, status
from fastapi.responses import StreamingResponse
from app.services.voice_lab import voice_lab_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice-lab", tags=["voice-lab"])

@router.get("/config")
async def get_config():
    """Get available providers, voices, and models."""
    return voice_lab_service.get_all_configs()

@router.post("/tts")
async def tts_endpoint(
    provider: str = Form(...), 
    text: str = Form(...), 
    voice_id: str = Form(...), 
    model: str = Form("default")
):
    """Generate speech from text."""
    try:
        logger.info(f"TTS Request: {provider} - {voice_id}")
        svc = voice_lab_service.get_provider(provider)
        
        async def audio_gen():
            try:
                async for chunk in svc.tts(text, voice_id, model):
                    yield chunk
            except Exception as e:
                logger.error(f"TTS Streaming Error: {e}")
                # We can't change HTTP status since stream started, but we stop yielding.
        
        # Return audio/mpeg as generic container, checking if wav needed for Azure
        media_type = "audio/mpeg"
        if provider == "azure":
             media_type = "audio/wav" 
        
        return StreamingResponse(audio_gen(), media_type=media_type)
    except Exception as e:
        logger.error(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stt")
async def stt_endpoint(
    provider: str = Form(...), 
    file: UploadFile = File(...)
):
    """Transcribe audio file."""
    try:
        logger.info(f"STT Request: {provider}")
        svc = voice_lab_service.get_provider(provider)
        content = await file.read()
        text = await svc.stt(content)
        return {"text": text}
    except Exception as e:
        logger.error(f"STT Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/live/{provider}")
async def websocket_live(websocket: WebSocket, provider: str):
    """
    Experimental Live Proxy.
    Currently just establishes connection to verify routing.
    Full implementation requires robust bidirectional WS proxying.
    """
    await websocket.accept()
    await websocket.send_json({"type": "status", "content": f"Connected to {provider} Lab Proxy (Echo Mode)"})
    
    try:
        while True:
            # Simple Echo for connectivity test
            data = await websocket.receive_text() # Or bytes
            await websocket.send_json({"type": "transcript", "content": f"Echo: {data}"})
    except Exception as e:
        logger.warning(f"WS Error: {e}")
    finally:
        await websocket.close()
