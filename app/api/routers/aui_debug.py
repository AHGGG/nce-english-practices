from fastapi import APIRouter
from typing import Dict, Any
from pydantic import BaseModel

from app.services.aui import aui_renderer, AUIRenderPacket

router = APIRouter(prefix="/api/aui/debug", tags=["AUI Debug"])


class DebugRenderRequest(BaseModel):
    intent: str
    data: Dict[str, Any]
    user_level: int = 1


@router.post("/render", response_model=AUIRenderPacket)
async def debug_render_ui(request: DebugRenderRequest):
    """
    Simulate the Agent deciding to render a UI component.
    """
    return aui_renderer.render(
        intent=request.intent, data=request.data, user_level=request.user_level
    )
