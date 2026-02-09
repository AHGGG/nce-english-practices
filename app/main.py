from fastapi import FastAPI

from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import os

from app.services.dictionary import dict_manager
from app.api.routers import (
    auth,
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
    podcast,
    vocabulary,
    audiobook,
    transcription,
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

from app.config import settings

# Security check for SECRET_KEY
if settings.SECRET_KEY == "dev-secret-key-change-in-production-use-openssl-rand-hex-32":
    logger.warning(
        "🚨 SECURITY WARNING: Using default insecure SECRET_KEY! "
        "Set SECRET_KEY env variable in production."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB (Create tables)
    # The original main.py had comments about creating tables but didn't actually call create_all.
    # It seems Alembic is used or database.py handles it.

    # Load dictionary on startup (Background)
    logger.info("Startup: Initiating dictionary loading in background...")
    # Run synchronous load_dictionaries in a thread to avoid blocking the event loop
    asyncio.create_task(asyncio.to_thread(dict_manager.load_dictionaries))

    # Start AUI Input Listener (Postgres LISTEN/NOTIFY)
    from app.services.aui_input import input_service

    await input_service.start_listener()

    # Start Podcast Trending Cache Refresher (Every 12 hours, start after 1h delay)
    from app.services.podcast_service import podcast_service

    asyncio.create_task(podcast_service.start_cache_refresher(initial_delay=3600))

    # Start Content Analysis Service (analyze EPUBs in background)
    from app.services.content_analysis import content_analysis_service

    async def run_content_analysis():
        """Run content analysis with a delay to let server start first."""
        await asyncio.sleep(30)  # Wait 30s for server to fully start
        try:
            stats = await content_analysis_service.analyze_all_epubs()
            logger.info(f"Content analysis complete: {stats}")
        except Exception as e:
            logger.error(f"Content analysis failed: {e}")

    asyncio.create_task(run_content_analysis())

    yield

    # Cleanup
    await input_service.stop_listener()


app = FastAPI(title="NCE English Practice", lifespan=lifespan)

# Configure CORS
from fastapi.middleware.cors import CORSMiddleware

# Define origins that are explicitly allowed
origins = [
    "http://localhost:3000",  # Web App
    "http://localhost:5173",  # Vite Dev Server
    "http://localhost:8081",  # Mobile Web (Expo)
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8081",
]

# Allow all local network IPs dynamically for development convenience
# This is important for Expo Go on physical devices
import socket

try:
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    # Add common local subnets if needed, or just rely on regex/allow_origin_regex if FastAPI supported it better.
    # Since FastAPI CORSMiddleware is strict, we can add wildcard "*" for development
    # OR we just add the specific local IP detected.
    origins.append(f"http://{local_ip}:8081")
    origins.append(f"http://{local_ip}:3000")
    origins.append(f"http://{local_ip}:8000")
    origins.append(f"exp://{local_ip}:8081")
except Exception:
    pass

app.add_middleware(
    CORSMiddleware,
    # In production, you might want to be stricter.
    # For a dev/home server context, allowing "*" is often necessary for mobile apps
    # because they might not send an Origin header, or it might be null.
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)  # Auth routes first
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
app.include_router(podcast.router)
app.include_router(vocabulary.router)
app.include_router(audiobook.router)
app.include_router(transcription.router)

from app.models.schemas import RemoteLog  # noqa: E402

from app.services.log_collector import (  # noqa: E402
    log_collector,
    LogEntry,
    LogSource,
    LogLevel,
    LogCategory,
    detect_category,
)
from datetime import datetime  # noqa: E402


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
from fastapi.staticfiles import StaticFiles  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402

frontend_dist = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "apps", "web", "dist")
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
        logger.info("Starting with HTTPS (self-signed certificate)")
        logger.info("Access via: https://192.168.0.100:8000")
        logger.info("Note: Accept the security warning in your browser")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_excludes=[".git", "__pycache__", "node_modules"],
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile,
        )
    else:
        logger.info("Starting with HTTP (Default)")
        if use_https:
            logger.warning(
                "WARNING: HTTPS requested but certificates (key.pem/cert.pem) not found."
            )
        logger.info(
            "For mobile voice, generate cert: uv run python scripts/generate_cert.py"
        )
        logger.info("To enable HTTPS: ./scripts/dev.ps1 -Https")
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_excludes=[".git", "__pycache__", "node_modules"],
        )
