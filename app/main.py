from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import os
import traceback
import uuid

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
    background_tasks: list[tuple[str, asyncio.Task]] = []

    # Initialize DB (Create tables)
    # The original main.py had comments about creating tables but didn't actually call create_all.
    # It seems Alembic is used or database.py handles it.

    # Load dictionary on startup (Background)
    logger.info("Startup: Initiating dictionary loading in background...")
    # Run async load_dictionaries directly in background
    dictionary_load_task = asyncio.create_task(dict_manager.load_dictionaries())
    background_tasks.append(("dictionary_loader", dictionary_load_task))

    # Start AUI Input Listener (Postgres LISTEN/NOTIFY)
    from app.services.aui_input import input_service

    await input_service.start_listener()

    # Start Podcast Trending Cache Refresher (Every 12 hours, start after 1h delay)
    from app.services.podcast_service import podcast_service

    podcast_refresher_task = asyncio.create_task(
        podcast_service.start_cache_refresher(initial_delay=3600)
    )
    background_tasks.append(("podcast_cache_refresher", podcast_refresher_task))

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

    content_analysis_task = asyncio.create_task(run_content_analysis())
    background_tasks.append(("content_analysis", content_analysis_task))

    yield

    # Cleanup
    for task_name, task in background_tasks:
        if task.done():
            continue
        task.cancel()

    for task_name, task in background_tasks:
        if task.done():
            continue
        try:
            await asyncio.wait_for(task, timeout=3.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            logger.info(f"Background task cancelled during shutdown: {task_name}")
        except Exception as e:
            logger.warning(f"Background task error during shutdown ({task_name}): {e}")

    await input_service.stop_listener()
    await dict_manager.shutdown()


app = FastAPI(title="NCE English Practice", lifespan=lifespan)

# --- Global Exception Handlers ---
from app.models.schemas import ErrorResponse


def _is_debug_enabled() -> bool:
    return os.getenv("DEBUG", "false").lower() == "true"


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with standardized format."""
    request_id = str(uuid.uuid4())[:8]

    if exc.status_code >= 500:
        logger.error(
            f"[{request_id}] HTTP {exc.status_code}: {exc.detail} - {request.url.path}"
        )
    else:
        logger.warning(
            f"[{request_id}] HTTP {exc.status_code}: {exc.detail} - {request.url.path}"
        )

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=f"HTTP_{exc.status_code}",
            message=str(exc.detail),
            detail=exc.detail,
            request_id=request_id,
        ).model_dump(mode="json"),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed field information."""
    request_id = str(uuid.uuid4())[:8]
    errors = exc.errors()

    logger.warning(f"[{request_id}] Validation error: {errors} - {request.url.path}")

    detail = [
        {
            "field": ".".join(str(loc) for loc in err.get("loc", [])),
            "message": err.get("msg", ""),
            "type": err.get("type", ""),
        }
        for err in errors
    ]

    return JSONResponse(
        status_code=422,
        content=ErrorResponse(
            error="ValidationError",
            message="Request validation failed",
            detail=detail,
            request_id=request_id,
        ).model_dump(mode="json"),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler - prevents app crash with standardized error response."""
    request_id = str(uuid.uuid4())[:8]

    error_msg = f"[{request_id}] Unhandled Exception: {str(exc)}\nURL: {request.url.path}\n{traceback.format_exc()}"
    logger.error(error_msg)

    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="InternalError",
            message="An internal error occurred. Please check server logs.",
            detail={"request_id": request_id} if not _is_debug_enabled() else str(exc),
            request_id=request_id,
        ).model_dump(mode="json"),
    )


# --- End Handlers ---

# Configure CORS
from fastapi.middleware.cors import CORSMiddleware
import socket

# Default allowed origins (strict list for security)
_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8081",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8000",
]

# Add dynamic local IP for development (Expo Go on physical devices)
try:
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    _origins.extend(
        [
            f"http://{local_ip}:8081",
            f"http://{local_ip}:3000",
            f"http://{local_ip}:8000",
            f"exp://{local_ip}:8081",
        ]
    )
except Exception:
    pass

# Check if we should allow all origins (dev mode only)
allow_all = settings.CORS_ALLOW_ALL
if allow_all:
    import logging

    logging.warning(
        "CORS_ALLOW_ALL=true - WARNING: Allowing all origins is insecure for production!"
    )
    cors_origins = ["*"]
else:
    cors_origins = _origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
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
    import copy
    from uvicorn.config import LOGGING_CONFIG

    # Customize Uvicorn logging to match application format (with timestamps)
    log_config = copy.deepcopy(LOGGING_CONFIG)
    # Use standard logging format with timestamps
    log_config["formatters"]["default"]["fmt"] = (
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    log_config["formatters"]["access"]["fmt"] = (
        '%(asctime)s - %(name)s - %(levelname)s - %(client_addr)s - "%(request_line)s" %(status_code)s'
    )

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
            log_config=log_config,
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
            log_config=log_config,
        )
