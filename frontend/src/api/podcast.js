/**
 * Podcast API client.
 */

import { authFetch } from './auth';

const BASE_URL = '/api/podcast';

/**
 * Search podcasts via iTunes.
 */
export async function searchPodcasts(query, { limit = 20, country = 'US' } = {}) {
  const params = new URLSearchParams({ q: query, limit, country });
  const response = await authFetch(`${BASE_URL}/search?${params}`);
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}

/**
 * Subscribe to a podcast by RSS URL.
 */
export async function subscribeToPodcast(rssUrl) {
  const response = await authFetch(`${BASE_URL}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rss_url: rssUrl }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Subscribe failed');
  }
  return response.json();
}

/**
 * Unsubscribe from a podcast.
 */
export async function unsubscribeFromPodcast(feedId) {
  const response = await authFetch(`${BASE_URL}/feed/${feedId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Unsubscribe failed');
  return response.json();
}

/**
 * Get all subscribed podcasts.
 */
export async function getSubscriptions() {
  const response = await authFetch(`${BASE_URL}/feeds`);
  if (!response.ok) throw new Error('Failed to get subscriptions');
  return response.json();
}

/**
 * Get feed details with episodes.
 */
export async function getFeedDetail(feedId) {
  const response = await authFetch(`${BASE_URL}/feed/${feedId}`);
  if (!response.ok) throw new Error('Failed to get feed');
  return response.json();
}

/**
 * Refresh a feed for new episodes.
 */
export async function refreshFeed(feedId) {
  const response = await authFetch(`${BASE_URL}/feed/${feedId}/refresh`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Refresh failed');
  return response.json();
}

/**
 * Import OPML file.
 */
export async function importOPML(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await authFetch(`${BASE_URL}/opml/import`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Import failed');
  return response.json();
}

/**
 * Export subscriptions as OPML.
 */
export async function exportOPML() {
  const response = await authFetch(`${BASE_URL}/opml/export`);
  if (!response.ok) throw new Error('Export failed');
  return response.blob();
}

// --- Listening Sessions ---

/**
 * Start a listening session.
 */
export async function startListeningSession(episodeId) {
  const response = await authFetch(`${BASE_URL}/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ episode_id: episodeId }),
  });
  if (!response.ok) throw new Error('Failed to start session');
  return response.json();
}

/**
 * Update listening progress.
 */
export async function updateListeningSession(sessionId, totalSeconds, position, isFinished = false) {
  const response = await authFetch(`${BASE_URL}/session/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      total_listened_seconds: Math.floor(totalSeconds),
      last_position_seconds: position,
      is_finished: isFinished,
    }),
  });
  if (!response.ok) throw new Error('Failed to update session');
  return response.json();
}

/**
 * End a listening session.
 */
export async function endListeningSession(sessionId, totalSeconds, position, isFinished = false) {
  const response = await authFetch(`${BASE_URL}/session/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      total_listened_seconds: Math.floor(totalSeconds),
      last_position_seconds: position,
      is_finished: isFinished,
    }),
  });
  if (!response.ok) throw new Error('Failed to end session');
  return response.json();
}

/**
 * Get last playback position for resume.
 */
export async function getEpisodePosition(episodeId) {
  const response = await authFetch(`${BASE_URL}/episode/${episodeId}/position`);
  if (!response.ok) throw new Error('Failed to get position');
  return response.json();
}

/**
 * Get recently played episodes with resume positions.
 */
export async function getRecentlyPlayed(limit = 10) {
  const response = await authFetch(`${BASE_URL}/recently-played?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to get recently played');
  return response.json();
}

/**
 * Download episode audio for offline playback.
 */
export async function downloadEpisode(episodeId) {
  const response = await authFetch(`${BASE_URL}/episode/${episodeId}/download`);
  if (!response.ok) throw new Error('Download failed');
  return response.blob();
}
