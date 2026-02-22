import time
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user_id
from app.core.db import get_db
from app.models.podcast_schemas import (
    DeviceInfo,
    DeviceListResponse,
    ListeningSessionRequest,
    ListeningSessionUpdateRequest,
    PositionSyncRequest,
    PositionSyncResponse,
)
from app.services.podcast_service import podcast_service

router = APIRouter()


@router.post("/session/start")
async def start_session(
    req: ListeningSessionRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    session = await podcast_service.start_listening_session(
        db,
        user_id,
        req.episode_id,
        listening_mode=req.listening_mode,
    )
    return {
        "session_id": session.id,
        "started_at": session.started_at.isoformat(),
    }


@router.post("/session/update")
async def update_session(
    req: ListeningSessionUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    _ = user_id
    session = await podcast_service.update_listening_session(
        db,
        req.session_id,
        req.total_listened_seconds,
        req.total_active_seconds,
        req.last_position_seconds,
        req.is_finished,
    )
    if not session:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}


@router.post("/session/update-beacon")
async def update_session_beacon(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    import json

    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))

        session_id = data.get("session_id")
        listened_seconds = data.get("listened_seconds", 0)
        active_seconds = data.get("active_seconds", listened_seconds)
        position_seconds = data.get("position_seconds", 0)

        if not session_id:
            return {"success": False, "error": "Missing session_id"}

        is_finished = data.get("is_finished", False)
        session = await podcast_service.update_listening_session(
            db,
            session_id,
            listened_seconds,
            active_seconds,
            position_seconds,
            is_finished=is_finished,
        )
        return {"success": session is not None}
    except Exception as exc:  # pragma: no cover - defensive branch
        return {"success": False, "error": str(exc)}


@router.post("/session/end")
async def end_session(
    req: ListeningSessionUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    _ = user_id
    session = await podcast_service.end_listening_session(
        db,
        req.session_id,
        req.total_listened_seconds,
        req.total_active_seconds,
        req.last_position_seconds,
        req.is_finished,
    )
    if not session:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}


@router.get("/episode/{episode_id}/position")
async def get_episode_position(
    episode_id: int,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    position = await podcast_service.get_last_position(db, user_id, episode_id)
    return {"position_seconds": position}


@router.post("/episode/{episode_id}/position/sync")
async def sync_position(
    episode_id: int,
    request: PositionSyncRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    timestamp = datetime.fromtimestamp(request.timestamp / 1000)
    result = await podcast_service.update_episode_state(
        db,
        user_id,
        episode_id,
        request.position,
        is_finished=request.is_finished,
        duration=request.duration,
        device_id=request.device_id,
        device_type=request.device_type,
        timestamp=timestamp,
        playback_rate=request.playback_rate,
    )

    if result is None:
        current_state = await podcast_service.get_episode_state(db, user_id, episode_id)
        server_ts = (
            current_state.last_synced_at.timestamp() * 1000
            if current_state and current_state.last_synced_at
            else time.time() * 1000
        )
        position = current_state.current_position_seconds if current_state else 0.0
        is_finished = current_state.is_finished if current_state else False

        return PositionSyncResponse(
            success=True,
            position=position,
            is_finished=is_finished,
            server_timestamp=server_ts,
            conflict_resolved=True,
            message="Position not updated (server has newer data)",
        )

    return PositionSyncResponse(
        success=True,
        position=request.position,
        server_timestamp=time.time() * 1000,
        conflict_resolved=False,
    )


@router.get("/devices")
async def list_devices(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    devices = await podcast_service.list_devices(db, user_id)
    return DeviceListResponse(devices=[DeviceInfo(**item) for item in devices])


@router.post("/episode/{episode_id}/position/resolve")
async def resolve_position(
    episode_id: int,
    request: PositionSyncRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    current_state = await podcast_service.get_episode_state(db, user_id, episode_id)
    if not current_state:
        return PositionSyncResponse(
            success=True,
            position=request.position,
            server_timestamp=time.time() * 1000,
            conflict_resolved=False,
            message="No server state found",
        )

    server_ts = (
        current_state.last_synced_at.timestamp() * 1000
        if current_state.last_synced_at
        else 0
    )

    if request.timestamp > server_ts:
        return PositionSyncResponse(
            success=True,
            position=request.position,
            is_finished=False,
            server_timestamp=server_ts,
            conflict_resolved=False,
            message="Client is newer",
        )

    return PositionSyncResponse(
        success=True,
        position=current_state.current_position_seconds,
        is_finished=current_state.is_finished,
        server_timestamp=server_ts,
        conflict_resolved=True,
        message="Server is newer",
    )
