/**
 * Podcast API client.
 */

import { authFetch, apiGet, apiPost, apiDelete } from "./auth";

const BASE_URL = "/api/podcast";

// Simple in-memory cache for search results to avoid redundant calls on navigation
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Search podcasts via iTunes.
 */
export async function searchPodcasts(
  query,
  { limit = 20, country = "US", category = null } = {},
) {
  const cacheKey = JSON.stringify({ query, limit, country, category });
  const now = Date.now();

  // Check cache
  if (searchCache.has(cacheKey)) {
    const { timestamp, data } = searchCache.get(cacheKey);
    if (now - timestamp < CACHE_TTL) {
      return data;
    }
    searchCache.delete(cacheKey);
  }

  const params = new URLSearchParams({ q: query, limit, country });
  if (category) params.append("category", category);

  const data = await apiGet(`${BASE_URL}/search?${params}`);

  // Update cache (limit size to 20 entries to prevent leaks)
  if (searchCache.size > 20) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(cacheKey, { timestamp: now, data });

  return data;
}

/**
 * Get trending podcasts.
 */
export async function getTrendingPodcasts({
  limit = 100,
  country = "US",
  category = null,
} = {}) {
  const params = new URLSearchParams({ limit, country });
  if (category) params.append("category", category);
  return apiGet(`${BASE_URL}/trending?${params}`);
}

/**
 * Get podcast categories.
 */
export async function getCategories() {
  return apiGet(`${BASE_URL}/categories`);
}

/**
 * Preview a podcast by RSS URL (without subscribing).
 */
export async function previewPodcast(rssUrl) {
  return apiPost(`${BASE_URL}/preview`, { rss_url: rssUrl });
}

/**
 * Subscribe to a podcast by RSS URL.
 */
export async function subscribeToPodcast(rssUrl) {
  return apiPost(`${BASE_URL}/subscribe`, { rss_url: rssUrl });
}

/**
 * Unsubscribe from a podcast.
 */
export async function unsubscribeFromPodcast(feedId) {
  return apiDelete(`${BASE_URL}/feed/${feedId}`);
}

/**
 * Get all subscribed podcasts.
 */
export async function getSubscriptions() {
  return apiGet(`${BASE_URL}/feeds`);
}

/**
 * Get feed details with episodes.
 */
export async function getFeedDetail(feedId, limit = 50, offset = 0) {
  return apiGet(`${BASE_URL}/feed/${feedId}?limit=${limit}&offset=${offset}`);
}

/**
 * Refresh a feed for new episodes.
 */
export async function refreshFeed(feedId) {
  return apiPost(`${BASE_URL}/feed/${feedId}/refresh`);
}

/**
 * Import OPML file.
 */
export async function importOPML(file) {
  const formData = new FormData();
  formData.append("file", file);

  // Use authFetch for FormData (no Content-Type header needed)
  const response = await authFetch(`${BASE_URL}/opml/import`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("Import failed");
  return response.json();
}

/**
 * Import OPML file with streaming progress.
 * @param {File} file - OPML file to import
 * @param {function} onProgress - Callback for progress events: ({type, current, total, title, success, error, imported, skipped})
 * @returns {Promise<{imported: number, skipped: number, total: number}>}
 */
export async function importOPMLStreaming(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  // Use authFetch for streaming - it handles token management properly
  const response = await authFetch(`${BASE_URL}/opml/import/stream`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Import failed" }));
    throw new Error(error.detail || "Import failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = { imported: 0, skipped: 0, total: 0 };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || ""; // Keep incomplete event in buffer

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (onProgress) onProgress(data);

          if (data.type === "complete") {
            result = {
              imported: data.imported,
              skipped: data.skipped,
              failed: data.failed || 0,
              total: data.total,
            };
          }
        } catch (e) {
          console.error("SSE parse error:", e);
        }
      }
    }
  }

  return result;
}

/**
 * Export subscriptions as OPML.
 */
export async function exportOPML() {
  const response = await authFetch(`${BASE_URL}/opml/export`);
  if (!response.ok) throw new Error("Export failed");
  return response.blob();
}

// --- Listening Sessions ---

/**
 * Start a listening session.
 */
export async function startListeningSession(episodeId) {
  return apiPost(`${BASE_URL}/session/start`, { episode_id: episodeId });
}

/**
 * Update listening progress.
 */
export async function updateListeningSession(
  sessionId,
  totalSeconds,
  position,
  isFinished = false,
) {
  return apiPost(`${BASE_URL}/session/update`, {
    session_id: sessionId,
    total_listened_seconds: Math.floor(totalSeconds),
    last_position_seconds: position,
    is_finished: isFinished,
  });
}

/**
 * End a listening session.
 */
export async function endListeningSession(
  sessionId,
  totalSeconds,
  position,
  isFinished = false,
) {
  return apiPost(`${BASE_URL}/session/end`, {
    session_id: sessionId,
    total_listened_seconds: Math.floor(totalSeconds),
    last_position_seconds: position,
    is_finished: isFinished,
  });
}

/**
 * Get last playback position for resume.
 */
export async function getEpisodePosition(episodeId) {
  return apiGet(`${BASE_URL}/episode/${episodeId}/position`);
}

/**
 * Sync position with server (with conflict detection).
 * @param {number} episodeId
 * @param {object} data - { position, timestamp, deviceId, deviceType, playbackRate }
 */
export async function syncPosition(episodeId, data) {
  return apiPost(`${BASE_URL}/episode/${episodeId}/position/sync`, {
    position: data.position,
    is_finished: data.isFinished || false,
    duration: data.duration,
    timestamp: data.timestamp,
    device_id: data.deviceId,
    device_type: data.deviceType,
    playback_rate: data.playbackRate,
  });
}

/**
 * Trigger AI transcription for an episode.
 * @param {number} episodeId
 * @param {boolean} force - Force restart if stuck in processing/pending
 * @param {string|null} remoteUrl - Optional remote transcription URL
 * @param {string|null} apiKey - Optional remote API Key
 * @returns {Promise<{status: string, message: string}>}
 */
export async function transcribeEpisode(
  episodeId,
  force = false,
  remoteUrl = null,
  apiKey = null,
) {
  try {
    return await apiPost(`${BASE_URL}/episode/${episodeId}/transcribe`, {
      force,
      remote_url: remoteUrl || undefined,
      api_key: apiKey || undefined,
    });
  } catch (error) {
    // Handle 409 Conflict specially
    if (error.status === 409) {
      return { status: "in_progress", message: error.message };
    }
    throw error;
  }
}

/**
 * Get recently played episodes with resume positions.
 */
export async function getRecentlyPlayed(limit = 10) {
  return apiGet(`${BASE_URL}/recently-played?limit=${limit}`);
}

/**
 * Check and update file sizes for specified episodes.
 * @param {Array<number>} episodeIds
 * @returns {Promise<{updated: Object.<number, number>}>}
 */
export async function checkEpisodeSizes(episodeIds) {
  return apiPost(`${BASE_URL}/episodes/check-size`, {
    episode_ids: episodeIds,
  });
}

/**
 * Download episode audio for offline playback.
 */
export async function downloadEpisode(episodeId) {
  const response = await authFetch(`${BASE_URL}/episode/${episodeId}/download`);
  if (!response.ok) throw new Error("Download failed");
  return response.blob();
}

/**
 * Get episode details including transcript status.
 * @param {number} episodeId
 * @returns {Promise<object>}
 */
export async function getEpisodeDetail(episodeId) {
  return apiGet(`${BASE_URL}/episode/${episodeId}`);
}

/**
 * Get details for multiple episodes by ID (batch request).
 * Used for efficient bulk loading (e.g., downloads page).
 * @param {Array<number>} episodeIds
 * @returns {Promise<Array<{episode: object, feed: object}>>}
 */
export async function getEpisodesBatch(episodeIds) {
  return apiPost(`${BASE_URL}/episodes/batch`, { episode_ids: episodeIds });
}

/**
 * Resolve position conflict.
 * Note: Caller must provide data with backend-compatible keys (snake_case).
 */
export async function resolvePosition(episodeId, data) {
  return apiPost(`${BASE_URL}/episode/${episodeId}/position/resolve`, data);
}
