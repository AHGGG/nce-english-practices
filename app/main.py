from fastapi import FastAPI, Request

from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import os

from app.services.dictionary import dict_manager
from app.api.routers import (
    theme,
    story,
    matrix,
    scenario,
    chat,
    stats,
    dictionary,
    voice_lab,
    deepgram_websocket,
    elevenlabs_websocket,
    aui_stream,
    aui_stream_demo
)
from app.services.log_collector import setup_logging
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()

# Setup unified logging (bridges Python logging to logs/unified.log)
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB (Create tables)
    # The original main.py had comments about creating tables but didn't actually call create_all.
    # It seems Alembic is used or database.py handles it.
    
    # Load dictionary on startup (Background)
    print("Startup: Initiating dictionary loading in background...")
    # Run synchronous load_dictionaries in a thread to avoid blocking the event loop
    asyncio.create_task(asyncio.to_thread(dict_manager.load_dictionaries))
    yield
    # Cleanup if needed

app = FastAPI(title="NCE English Practice", lifespan=lifespan)

# Include Routers
app.include_router(voice.router)
app.include_router(dictionary.router)
app.include_router(content.router)
app.include_router(practice.router)

app.include_router(stats.router)
app.include_router(coach.router)
app.include_router(deepgram.router)

app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(voice_lab.router, prefix="/api", tags=["voice-lab"])

from app.api.routers import deepgram_websocket
app.include_router(deepgram_websocket.router, tags=["websocket"])
from app.api.routers import elevenlabs_websocket
app.include_router(elevenlabs_websocket.router, tags=["websocket"])
from app.api.routers import aui_debug
app.include_router(aui_debug.router)
from app.api.routers import aui_stream
app.include_router(aui_stream.router, prefix="/api", tags=["aui-stream"])
app.include_router(aui_stream_demo.router, prefix="/api", tags=["aui-stream-demo"])

from app.models.schemas import RemoteLog
from app.services.log_collector import (
    log_collector, LogEntry, LogSource, LogLevel, LogCategory, detect_category
)
from datetime import datetime

@app.post("/api/logs")
async def receive_remote_log(log: RemoteLog):
    """
    Receive logs from frontend and add to unified log collector.
    """
    # Parse level
    try:
        level = LogLevel(log.level.lower())
    except ValueError:
        level = LogLevel.INFO
    
    # Detect or use provided category
    if log.category:
        try:
            category = LogCategory(log.category)
        except ValueError:
            category = detect_category(log.message, log.data)
    else:
        category = detect_category(log.message, log.data)
    
    # Parse timestamp
    try:
        timestamp = datetime.fromisoformat(log.timestamp) if log.timestamp else datetime.now()
    except (ValueError, TypeError):
        timestamp = datetime.now()
    
    entry = LogEntry(
        timestamp=timestamp,
        source=LogSource.FRONTEND,
        level=level,
        category=category,
        message=log.message,
        data=log.data
    )
    log_collector.add(entry)
    return {"status": "ok"}



if __name__ == "__main__":
    import uvicorn
    import os
    
    # Check for SSL certificates
    ssl_keyfile = "key.pem" if os.path.exists("key.pem") else None
    ssl_certfile = "cert.pem" if os.path.exists("cert.pem") else None
    
    if ssl_keyfile and ssl_certfile:
        print("Starting with HTTPS (self-signed certificate)")
        print("Access via: https://192.168.0.100:8000")
        print("Note: Accept the security warning in your browser")
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True,
                    ssl_keyfile=ssl_keyfile, ssl_certfile=ssl_certfile)
    else:
        print("Starting with HTTP (no SSL)")
        print("For mobile voice, generate cert: uv run python scripts/generate_cert.py")
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
