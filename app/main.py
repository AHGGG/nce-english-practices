from fastapi import FastAPI

from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import os

from app.services.dictionary import dict_manager
from app.api.routers import (
    voice,
    dictionary,
    content,
    stats,
    voice_lab,
    aui_input,
    deepgram,
    aui_debug,
    aui_websocket,
    context_router,
    tts,
    negotiation,
    books,
    inspect,
    reading,
    proficiency,
    sentence_study,
    voice_session,
    review,
    verify,
    images,
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
app.include_router(stats.router)

app.include_router(voice_lab.router)

app.include_router(deepgram.router, tags=["websocket"])

app.include_router(aui_debug.router)
app.include_router(aui_input.router, prefix="/api/aui", tags=["AUI Input"])
app.include_router(aui_websocket.router, tags=["AUI WebSocket"])
app.include_router(context_router.router)
app.include_router(tts.router)
app.include_router(negotiation.router)
app.include_router(books.router, prefix="/api")
app.include_router(inspect.router)
app.include_router(reading.router)
app.include_router(proficiency.router)
app.include_router(sentence_study.router)
app.include_router(voice_session.router)
app.include_router(review.router)
app.include_router(verify.router)
app.include_router(images.router)

from app.models.schemas import RemoteLog
from app.services.log_collector import (
    log_collector,
    LogEntry,
    LogSource,
    LogLevel,
    LogCategory,
    detect_category,
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
        timestamp = (
            datetime.fromisoformat(log.timestamp) if log.timestamp else datetime.now()
        )
    except (ValueError, TypeError):
        timestamp = datetime.now()

    entry = LogEntry(
        timestamp=timestamp,
        source=LogSource.FRONTEND,
        level=level,
        category=category,
        message=log.message,
        data=log.data,
    )
    # Run sync file I/O in threadpool to avoid blocking event loop
    import asyncio

    await asyncio.to_thread(log_collector.add, entry)
    return {"status": "ok"}


# --- Static File Serving for Frontend SPA ---
# Must be mounted AFTER all API routes to avoid shadowing them
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
)
index_html = os.path.join(frontend_dist, "index.html")

if os.path.exists(frontend_dist):
    # Mount static assets (JS, CSS, images)
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_dist, "assets")),
        name="assets",
    )

    # Serve other static files at root (favicon, etc.)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback: serve index.html for all non-API routes."""
        # Try to serve static file first
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Fallback to index.html for SPA routing
        return FileResponse(index_html)

    logger.info(f"Serving frontend from: {frontend_dist}")
else:
    logger.warning(f"Frontend dist not found at: {frontend_dist}")


if __name__ == "__main__":
    import uvicorn
    import os

    # Check for SSL certificates and intent
    ssl_keyfile = "key.pem" if os.path.exists("key.pem") else None
    ssl_certfile = "cert.pem" if os.path.exists("cert.pem") else None
    use_https = os.getenv("USE_HTTPS", "false").lower() == "true"

    if use_https and ssl_keyfile and ssl_certfile:
        print("Starting with HTTPS (self-signed certificate)")
        print("Access via: https://192.168.0.100:8000")
        print("Note: Accept the security warning in your browser")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile,
        )
    else:
        print("Starting with HTTP (Default)")
        if use_https:
            print("WARNING: HTTPS requested but certificates (key.pem/cert.pem) not found.")
        print("For mobile voice, generate cert: uv run python scripts/generate_cert.py")
        print("To enable HTTPS: ./scripts/dev.ps1 -Https")
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
