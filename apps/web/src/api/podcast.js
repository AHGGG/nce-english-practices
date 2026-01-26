/**
 * Podcast API client.
 */

import { authFetch } from './auth';

const BASE_URL = '/api/podcast';

// Simple in-memory cache for search results to avoid redundant calls on navigation
const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Search podcasts via iTunes.
 */
export async function searchPodcasts(query, { limit = 20, country = 'US', category = null } = {}) {
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
  if (category) params.append('category', category);
  const response = await authFetch(`${BASE_URL}/search?${params}`);
  if (!response.ok) throw new Error('Search failed');
  
  const data = await response.json();
  
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
export async function getTrendingPodcasts({ limit = 100, country = 'US', category = null } = {}) {
  const params = new URLSearchParams({ limit, country });
  if (category) params.append('category', category);
  const response = await authFetch(`${BASE_URL}/trending?${params}`);
  if (!response.ok) throw new Error('Failed to get trending podcasts');
  return response.json();
}

/**
 * Get podcast categories.
 */
export async function getCategories() {
  const response = await authFetch(`${BASE_URL}/categories`);
  if (!response.ok) throw new Error('Failed to get categories');
  return response.json();
}

/**
 * Preview a podcast by RSS URL (without subscribing).
 */
export async function previewPodcast(rssUrl) {
  const response = await authFetch(`${BASE_URL}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rss_url: rssUrl }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Preview failed');
  }
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
export async function getFeedDetail(feedId, limit = 50, offset = 0) {
  const response = await authFetch(`${BASE_URL}/feed/${feedId}?limit=${limit}&offset=${offset}`);
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
 * Import OPML file with streaming progress.
 * @param {File} file - OPML file to import
 * @param {function} onProgress - Callback for progress events: ({type, current, total, title, success, error, imported, skipped})
 * @returns {Promise<{imported: number, skipped: number, total: number}>}
 */
export async function importOPMLStreaming(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  
  // Get token for auth header
  const token = localStorage.getItem('access_token');
  
  const response = await fetch(`${BASE_URL}/opml/import/stream`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Import failed' }));
    throw new Error(error.detail || 'Import failed');
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = { imported: 0, skipped: 0, total: 0 };
  
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Process complete SSE events
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // Keep incomplete event in buffer
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (onProgress) onProgress(data);
          
          if (data.type === 'complete') {
            result = { 
              imported: data.imported, 
              skipped: data.skipped, 
              failed: data.failed || 0,
              total: data.total 
            };
          }
        } catch (e) {
          console.error('SSE parse error:', e);
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
 * Get details for multiple episodes by ID.
 * Used for efficient bulk loading (e.g., downloads page).
 */
export async function getEpisodesBatch(episodeIds) {
  const response = await authFetch(`${BASE_URL}/episodes/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ episode_ids: episodeIds }),
  });
  if (!response.ok) throw new Error('Failed to get episodes');
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
