# Podcast System (Offline Playback)

## Architecture (2026-01-22 Update)

### Data Models

- **PodcastFeed**: Global model for podcast feeds
- **PodcastFeedSubscription**: Many-to-Many relationship for user subscriptions
- **UserEpisodeState**: Tracks resume position and finished status per user/episode

### Fields

| Model                     | Key Fields                                              |
| ------------------------- | ------------------------------------------------------- |
| `PodcastFeed`             | Global feed data                                        |
| `PodcastFeedSubscription` | user_id, feed_id                                        |
| `UserEpisodeState`        | current_position_seconds, finished, user_id, episode_id |

## Offline Strategy

### PWA Support

- `vite-plugin-pwa` + Workbox for service worker caching
- `podcast-audio-cache` using Cache API for audio files

### Progress Tracking

Backend download endpoint (`/api/podcast/episode/{id}/download`):

- Supports `HEAD` requests for Content-Length
- Streams audio with proper caching headers

### Frontend Components

| Component               | Description                    |
| ----------------------- | ------------------------------ |
| `PodcastFeedDetailView` | Shows download progress/status |
| `PodcastDownloadsView`  | Manages offline content        |

## Key Features

1. **Resume Playback**: Stores current_position_seconds per episode
2. **Offline Access**: Downloaded audio stored in Cache API
3. **Progress Sync**: Backend tracks playback position
4. **Remote Transcription**: Offload GPU-heavy transcription to a dedicated server

## Favorites and Playlists

### Favorites (Server-backed)

- Model: `podcast_favorite_episodes` (`PodcastFavoriteEpisode`)
- API:
  - `GET /api/podcast/favorites`
  - `GET /api/podcast/favorites/ids`
  - `POST /api/podcast/episode/{episode_id}/favorite`
  - `DELETE /api/podcast/episode/{episode_id}/favorite`
- Purpose: Cross-device synced favorite episodes for each user.

### Playlists (Client-only)

- Storage: Browser `localStorage` (`podcast_playlists_v1`)
- Utility: `apps/web/src/utils/podcastPlaylists.ts`
- Routes:
  - `GET /podcast/playlists` (Web view route)
  - `GET /podcast/playlist/:playlistId` (Web view route)
- Purpose: Lightweight local episode curation without backend persistence.

## Remote Transcription

The system supports a Client-Server model for transcription to reduce local resource usage.

- **Client Mode**: Configure a remote server URL and API Key in Settings. The backend sends audio to the remote server.
- **Server Mode**: Configure `TRANSCRIPTION_SERVICE_API_KEYS` in `.env`. The instance accepts `/api/transcribe` (legacy sync) and `/api/transcribe/jobs` + `/api/transcribe/jobs/{job_id}` (recommended async polling).

See [Transcription Service Documentation](docs/transcription-service.md) for detailed setup.

## Related Documentation

- [Podcast Architecture Skill](docs/skills/podcast-architecture.md) - Apple API strategy and caching mechanism
