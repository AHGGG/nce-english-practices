from fastapi import FastAPI, Request

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
from app.api.routers import deepgram_websocket
app.include_router(deepgram_websocket.router)

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
