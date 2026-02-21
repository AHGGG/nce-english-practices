import asyncio
import logging
import os
import socket
import traceback
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

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
    study_basket,
)
from app.config import settings
from app.models.schemas import ErrorResponse, RemoteLog
from app.services.dictionary import dict_manager
from app.services.log_collector import (
    LogCategory,
    LogEntry,
    LogLevel,
    LogSource,
    detect_category,
    log_collector,
)

logger = logging.getLogger(__name__)


def _is_debug_enabled() -> bool:
    return os.getenv("DEBUG", "false").lower() == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    background_tasks: list[tuple[str, asyncio.Task]] = []

    logger.info("Startup: Initiating dictionary loading in background...")
    dictionary_load_task = asyncio.create_task(dict_manager.load_dictionaries())
    background_tasks.append(("dictionary_loader", dictionary_load_task))

    from app.services.aui_input import input_service

    await input_service.start_listener()

    from app.services.podcast_service import podcast_service

    podcast_refresher_task = asyncio.create_task(
        podcast_service.start_cache_refresher(initial_delay=3600)
    )
    background_tasks.append(("podcast_cache_refresher", podcast_refresher_task))

    from app.services.content_analysis import content_analysis_service

    async def run_content_analysis():
        await asyncio.sleep(30)
        try:
            stats = await content_analysis_service.analyze_all_epubs()
            logger.info(f"Content analysis complete: {stats}")
        except Exception as e:
            logger.error(f"Content analysis failed: {e}")

    content_analysis_task = asyncio.create_task(run_content_analysis())
    background_tasks.append(("content_analysis", content_analysis_task))

    yield

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


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
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
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        request_id = str(uuid.uuid4())[:8]
        errors = exc.errors()

        logger.warning(
            f"[{request_id}] Validation error: {errors} - {request.url.path}"
        )

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
        request_id = str(uuid.uuid4())[:8]

        error_msg = f"[{request_id}] Unhandled Exception: {str(exc)}\nURL: {request.url.path}\n{traceback.format_exc()}"
        logger.error(error_msg)

        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="InternalError",
                message="An internal error occurred. Please check server logs.",
                detail={"request_id": request_id}
                if not _is_debug_enabled()
                else str(exc),
                request_id=request_id,
            ).model_dump(mode="json"),
        )


def configure_cors(app: FastAPI) -> None:
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8000",
    ]

    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        origins.extend(
            [
                f"http://{local_ip}:8081",
                f"http://{local_ip}:3000",
                f"http://{local_ip}:8000",
                f"exp://{local_ip}:8081",
            ]
        )
    except Exception:
        pass

    if settings.CORS_ALLOW_ALL:
        logging.warning(
            "CORS_ALLOW_ALL=true - WARNING: Allowing all origins is insecure for production!"
        )
        cors_origins = ["*"]
    else:
        cors_origins = origins

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )


def include_routers(app: FastAPI) -> None:
    app.include_router(auth.router)
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
    app.include_router(study_basket.router)


def register_remote_log_route(app: FastAPI) -> None:
    @app.post("/api/logs")
    async def receive_remote_log(log: RemoteLog):
        try:
            level = LogLevel(log.level.lower())
        except ValueError:
            level = LogLevel.INFO

        if log.category:
            try:
                category = LogCategory(log.category)
            except ValueError:
                category = detect_category(log.message, log.data)
        else:
            category = detect_category(log.message, log.data)

        try:
            timestamp = (
                datetime.fromisoformat(log.timestamp)
                if log.timestamp
                else datetime.now()
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
        await asyncio.to_thread(log_collector.add, entry)
        return {"status": "ok"}


def mount_frontend(app: FastAPI) -> None:
    frontend_dist = os.path.normpath(
        os.path.join(os.path.dirname(__file__), "..", "apps", "web", "dist")
    )
    index_html = os.path.join(frontend_dist, "index.html")

    if not os.path.exists(frontend_dist):
        logger.warning(f"Frontend dist not found at: {frontend_dist}")
        return

    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_dist, "assets")),
        name="assets",
    )

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(index_html)

    logger.info(f"Serving frontend from: {frontend_dist}")


def create_app() -> FastAPI:
    app = FastAPI(title="NCE English Practice", lifespan=lifespan)
    register_exception_handlers(app)
    configure_cors(app)
    include_routers(app)
    register_remote_log_route(app)
    mount_frontend(app)
    return app
