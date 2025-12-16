from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import os

from app.services.dictionary import dict_manager
from app.api.routers import voice, dictionary, content, practice, stats, deepgram
from app.routers import coach, voice_lab

load_dotenv()

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
app.include_router(voice_lab.router)
app.include_router(deepgram.router)

from app.models import RemoteLog

@app.post("/api/logs")
async def receive_remote_log(log: RemoteLog):
    """
    Receive logs from frontend and print them to backend console.
    """
    prefix = f"[FRONTEND] [{log.level.upper()}]"
    if log.timestamp:
        prefix += f" [{log.timestamp}]"
    
    print(f"{prefix} {log.message}")
    
    if log.data:
        # Check for stack trace to print nicely
        stack = log.data.get("stack")
        if stack:
            print(f"{prefix} STACK TRACE:\n{stack}")
            # Remove stack from data to avoid double printing if we want to print the rest
            del log.data["stack"]
        
        if log.data:
            print(f"{prefix} Data: {log.data}")
    
    return {"status": "ok"}

# --- SPA Static File Serving ---
# Serve React Build Files (Dist)

# 1. Mount assets (JS/CSS)
if os.path.exists("frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

# 2. Serve index.html for root and unknown paths (SPA Fallback)
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # API routes are already handled above by include_router
    # If a path matches a static file (e.g. favicon.ico), serve it?
    # For simplicity, let's just serve index.html for everything else unless it's a specific static file we want to expose.
    
    # 🛡️ Sentinel Security Fix: Prevent Path Traversal
    base_dir = os.path.abspath("frontend/dist")
    file_path = os.path.abspath(os.path.join(base_dir, full_path))

    # Verify the resolved path is actually inside the base directory
    if os.path.commonpath([base_dir, file_path]) == base_dir:
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
    # Fallback to index.html
    index_path = "frontend/dist/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend not built. Run 'npm run build' in frontend/ directory."}

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
        print("For mobile voice, generate cert: uv run python generate_cert.py")
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
