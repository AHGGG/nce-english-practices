/**
 * Offline utilities for podcast caching.
 * Uses Cache API for audio storage and IndexedDB for metadata.
 */

// Cache name must match workbox config in vite.config.js
const PODCAST_AUDIO_CACHE = 'podcast-audio-cache';

/**
 * Check if a podcast episode is available offline.
 * @param {string} url - The audio URL to check
 * @returns {Promise<boolean>}
 */
export async function isEpisodeOffline(url) {
  try {
    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    console.error('[Offline] Failed to check cache:', error);
    return false;
  }
}

/**
 * Download an episode for offline playback.
 * Uses the backend proxy to avoid CORS issues.
 * @param {number} episodeId - The episode ID
 * @param {string} proxyUrl - The backend proxy URL (e.g., /api/podcast/episode/{id}/download)
 * @param {function} onProgress - Optional progress callback (received, total)
 * @param {function} fetcher - Optional fetch function (use authFetch for authenticated requests)
 * @returns {Promise<boolean>} - True if download succeeded
 */
export async function downloadEpisodeForOffline(episodeId, proxyUrl, onProgress, fetcher = fetch) {
  try {
    const response = await fetcher(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    
    // Get total size for progress tracking
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    // Clone response for caching (can only read body once)
    const responseClone = response.clone();
    
    // Stream with progress if callback provided
    if (onProgress && total > 0) {
      const reader = response.body.getReader();
      let received = 0;
      
      // Just read through to track progress, we'll use the clone for caching
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
        onProgress(received, total);
      }
    }
    
    // Store in cache
    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    await cache.put(proxyUrl, responseClone);
    
    // Also store metadata in localStorage for quick access
    const offlineEpisodes = JSON.parse(localStorage.getItem('offline_episodes') || '[]');
    if (!offlineEpisodes.includes(episodeId)) {
      offlineEpisodes.push(episodeId);
      localStorage.setItem('offline_episodes', JSON.stringify(offlineEpisodes));
    }
    
    console.log(`[Offline] Episode ${episodeId} downloaded successfully`);
    return true;
  } catch (error) {
    console.error('[Offline] Download failed:', error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Remove an episode from offline storage.
 * @param {number} episodeId - The episode ID
 * @param {string} proxyUrl - The cached URL
 * @returns {Promise<boolean>}
 */
export async function removeOfflineEpisode(episodeId, proxyUrl) {
  try {
    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    await cache.delete(proxyUrl);
    
    // Remove from localStorage
    const offlineEpisodes = JSON.parse(localStorage.getItem('offline_episodes') || '[]');
    const updated = offlineEpisodes.filter((id) => id !== episodeId);
    localStorage.setItem('offline_episodes', JSON.stringify(updated));
    
    console.log(`[Offline] Episode ${episodeId} removed from cache`);
    return true;
  } catch (error) {
    console.error('[Offline] Remove failed:', error);
    return false;
  }
}

/**
 * Get list of episode IDs that are available offline.
 * @returns {number[]}
 */
export function getOfflineEpisodeIds() {
  try {
    return JSON.parse(localStorage.getItem('offline_episodes') || '[]');
  } catch {
    return [];
  }
}

/**
 * Get storage usage estimate.
 * @returns {Promise<{used: number, quota: number, usedMB: string, quotaMB: string}>}
 */
export async function getStorageEstimate() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      usedMB: ((estimate.usage || 0) / 1024 / 1024).toFixed(1),
      quotaMB: ((estimate.quota || 0) / 1024 / 1024).toFixed(0),
    };
  }
  return { used: 0, quota: 0, usedMB: '0', quotaMB: 'Unknown' };
}

/**
 * Clear all cached podcast audio.
 * @returns {Promise<boolean>}
 */
export async function clearPodcastCache() {
  try {
    await caches.delete(PODCAST_AUDIO_CACHE);
    localStorage.removeItem('offline_episodes');
    console.log('[Offline] Podcast cache cleared');
    return true;
  } catch (error) {
    console.error('[Offline] Failed to clear cache:', error);
    return false;
  }
}
