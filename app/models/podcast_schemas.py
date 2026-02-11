"""
Podcast Pydantic Schemas.
Moved from app/api/routers/podcast.py to separate concerns.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class PositionSyncRequest(BaseModel):
    position: float
    is_finished: bool = False
    duration: Optional[int] = None
    timestamp: float  # Unix timestamp in milliseconds
    device_id: str
    device_type: Optional[str] = "web"
    playback_rate: float = 1.0


class PositionSyncResponse(BaseModel):
    success: bool
    position: float
    is_finished: bool = False
    server_timestamp: float
    conflict_resolved: bool
    message: Optional[str] = None


class DeviceInfo(BaseModel):
    device_id: str
    device_type: Optional[str]
    last_active: Optional[datetime]


class DeviceListResponse(BaseModel):
    devices: List[DeviceInfo]


class ItunesSearchResult(BaseModel):
    itunes_id: Optional[int] = None
    title: str
    author: Optional[str] = None
    rss_url: Optional[str] = None
    artwork_url: Optional[str] = None
    genre: Optional[str] = None
    episode_count: Optional[int] = None
    is_subscribed: bool = False


class Category(BaseModel):
    id: str
    name: str


class SubscribeRequest(BaseModel):
    rss_url: str


class PreviewRequest(BaseModel):
    rss_url: str


class FeedResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    author: Optional[str]
    image_url: Optional[str]
    rss_url: str
    episode_count: Optional[int] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True


class EpisodeResponse(BaseModel):
    id: int
    guid: str
    title: str
    description: Optional[str]
    audio_url: str
    file_size: Optional[int]
    duration_seconds: Optional[int]
    chapters: Optional[List[dict]] = None
    image_url: Optional[str]
    published_at: Optional[str]
    transcript_status: str
    transcript_segments: Optional[List[dict]] = None  # Time-aligned segments
    # User state for resume playback
    current_position: float = 0.0
    is_finished: bool = False

    class Config:
        from_attributes = True


class FeedDetailResponse(BaseModel):
    feed: FeedResponse
    episodes: List[EpisodeResponse]
    is_subscribed: bool = False
    total_episodes: int = 0  # Added for pagination support


class ListeningSessionRequest(BaseModel):
    episode_id: int


class BatchEpisodesRequest(BaseModel):
    episode_ids: List[int]


class ListeningSessionUpdateRequest(BaseModel):
    session_id: int
    total_listened_seconds: int
    last_position_seconds: float
    is_finished: bool = False


class CheckSizeRequest(BaseModel):
    episode_ids: List[int]


class OPMLImportResult(BaseModel):
    total: int
    imported: int
    skipped: int
    errors: List[dict]


class TranscribeResponse(BaseModel):
    status: str
    message: str


class TranscribeRequest(BaseModel):
    force: bool = False
    remote_url: Optional[str] = None
    api_key: Optional[str] = None
