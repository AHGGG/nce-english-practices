from fastapi import FastAPI, Request

from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import os

from app.services.dictionary import dict_manager
from app.api.routers import (
    voice,
    dictionary,
    content,
    practice,
    stats,

    coach,
    voice_lab,
    voice_lab,
    aui_input,
    deepgram_websocket,
    elevenlabs_websocket,
    aui_debug,
    aui_websocket,
    context_router,
    tts,
    tts,
    negotiation,
    books,
    inspect,
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
    
    # Start AUI Input Listener (Postgres LISTEN/NOTIFY)
    from app.services.aui_input import input_service
    await input_service.start_listener()
    
    yield
    
    # Cleanup
    await input_service.stop_listener()

app = FastAPI(title="NCE English Practice", lifespan=lifespan)

# Include Routers
app.include_router(voice.router)
app.include_router(dictionary.router)
app.include_router(content.router)
app.include_router(practice.router)

app.include_router(stats.router)
app.include_router(coach.router)


app.include_router(voice_lab.router, prefix="/api", tags=["voice-lab"])

app.include_router(deepgram_websocket.router, tags=["websocket"])
app.include_router(elevenlabs_websocket.router, tags=["websocket"])
app.include_router(aui_debug.router)
app.include_router(aui_input.router, prefix="/api/aui", tags=["AUI Input"]) # New
app.include_router(aui_websocket.router, tags=["AUI WebSocket"])  # WebSocket transport
app.include_router(context_router.router)  # Context resources
app.include_router(tts.router)  # TTS API
app.include_router(negotiation.router) # Included negotiation router
app.include_router(books.router, prefix="/api") # Books API
app.include_router(inspect.router)  # Inspect API (word lookup + learning log)

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
    # TODO: Uncomment after fixing async issue
    # Run sync file I/O in threadpool to avoid blocking event loop
    import asyncio
    await asyncio.to_thread(log_collector.add, entry)
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
