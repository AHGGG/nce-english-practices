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
 * Get cached audio as Object URL for direct playback.
 * This bypasses network requests entirely by reading from Cache API.
 * @param {string} url - The cached URL to retrieve
 * @returns {Promise<string|null>} Object URL or null if not cached
 */
export async function getCachedAudioUrl(url) {
  try {
    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    const response = await cache.match(url);
    if (!response) return null;
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    console.log('[Offline] Created Object URL from cache:', url);
    return objectUrl;
  } catch (error) {
    console.error('[Offline] Failed to get cached audio:', error);
    return null;
  }
}

/**
 * Download an episode for offline playback using chunked requests.
 * @param {number} episodeId - The episode ID
 * @param {string} proxyUrl - The backend proxy URL
 * @param {function} onProgress - Optional progress callback (received, total)
 * @param {function} fetcher - Optional fetch function
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<boolean>} - True if download succeeded
 */
/**
 * Download an episode for offline playback.
 * Strategies:
 * 1. Direct Download: Try fetching directly from the source (audioUrl). This saves server bandwidth.
 * 2. Proxy Fallback: If direct download fails (CORS, Mixed Content), use the backend proxy (proxyUrl).
 * 
 * @param {number} episodeId - The episode ID
 * @param {string} proxyUrl - The backend proxy URL (used as cache key)
 * @param {string} audioUrl - The direct audio URL (optional, for optimization)
 * @param {function} onProgress - Optional progress callback (received, total)
 * @param {function} fetcher - Optional fetch function (for proxy auth)
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<boolean>} - True if download succeeded
 */
export async function downloadEpisodeForOffline(episodeId, proxyUrl, audioUrl, onProgress, fetcher = fetch, signal = null) {
  // Strategy 1: Direct Download (Optimization)
  if (audioUrl) {
    try {
      console.log(`[Offline] Attempting direct download from: ${audioUrl}`);
      
      // 1. Check CORS and Size with HEAD
      // Use native fetch to avoid sending Auth headers to external servers
      const headResponse = await fetch(audioUrl, { method: 'HEAD', mode: 'cors', signal });
      
      if (headResponse.ok) {
        const contentLength = headResponse.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
        
        // If we can determine size, proceed with direct download
        if (totalSize > 0) {
            await performChunkedDownload(audioUrl, proxyUrl, totalSize, headResponse.headers.get('content-type'), onProgress, fetch, signal);
            
            // Register success
            updateOfflineIndex(episodeId);
            console.log(`[Offline] Direct download successful for ${episodeId}`);
            return true;
        }
      }
      console.warn('[Offline] Direct HEAD failed or no content-length, falling back to proxy');
    } catch (e) {
      if (signal?.aborted) throw e;
      console.warn(`[Offline] Direct download failed (${e.message}), falling back to proxy`);
    }
  }

  // Strategy 2: Backend Proxy (Fallback)
  try {
    console.log(`[Offline] Starting proxy download via: ${proxyUrl}`);
    
    // 1. Get file size
    const headResponse = await fetcher(proxyUrl, { method: 'HEAD', signal });
    if (!headResponse.ok) throw new Error(`Proxy HEAD failed: ${headResponse.status}`);
    
    const contentLength = headResponse.headers.get('content-length');
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
    
    if (!totalSize) throw new Error('Could not determine file size from proxy');

    // 2. Download via Proxy
    await performChunkedDownload(proxyUrl, proxyUrl, totalSize, headResponse.headers.get('content-type'), onProgress, fetcher, signal);

    // 3. Register success
    updateOfflineIndex(episodeId);
    console.log(`[Offline] Proxy download successful for ${episodeId}`);
    return true;

  } catch (error) {
    if (signal?.aborted) {
      console.log('[Offline] Download cancelled by user');
    } else {
      console.error('[Offline] Download failed:', error);
    }
    // Re-throw to allow component to handle text
    throw error;
  }
}

/**
 * Helper to perform chunked download and cache storage.
 * @param {string} sourceUrl - URL to fetch from
 * @param {string} cacheKey - URL to use as cache key (usually proxyUrl)
 * @param {number} totalSize - Total file size
 * @param {string} contentType - Content Type
 * @param {function} onProgress - Progress callback
 * @param {function} fetcher - Fetch function to use
 * @param {AbortSignal} signal - Abort signal
 */
async function performChunkedDownload(sourceUrl, cacheKey, totalSize, contentType, onProgress, fetcher, signal) {
    const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
    const chunks = [];
    let received = 0;
    
    for (let start = 0; start < totalSize; start += CHUNK_SIZE) {
      if (signal?.aborted) throw new Error('Download aborted');
      
      const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
      const range = `bytes=${start}-${end}`;
      
      let chunkData = null;
      let retries = 3;
      
      while (retries > 0) {
        try {
          const response = await fetcher(sourceUrl, {
            headers: { Range: range },
            signal
          });
          
          if (!response.ok && response.status !== 206) {
             throw new Error(`Chunk failed: ${response.status}`);
          }
          
          chunkData = await response.blob();
          break; // Success
        } catch (e) {
          if (signal?.aborted) throw e;
          console.warn(`[Offline] Chunk retry ${4 - retries} for ${range}`, e);
          retries--;
          if (retries === 0) throw e;
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * (4 - retries)));
        }
      }
      
      chunks.push(chunkData);
      received += chunkData.size;
      if (onProgress) onProgress(received, totalSize);
    }
    
    // Assemble and Cache
    const fullBlob = new Blob(chunks, { type: contentType || 'audio/mpeg' });
    const cacheResponse = new Response(fullBlob, {
      headers: {
        'content-length': totalSize.toString(),
        'content-type': contentType || 'audio/mpeg'
      }
    });

    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    await cache.put(cacheKey, cacheResponse);
}

/**
 * Helper to update offline episodes index in localStorage.
 */
function updateOfflineIndex(episodeId) {
    const offlineEpisodes = JSON.parse(localStorage.getItem('offline_episodes') || '[]');
    if (!offlineEpisodes.includes(episodeId)) {
      offlineEpisodes.push(episodeId);
      localStorage.setItem('offline_episodes', JSON.stringify(offlineEpisodes));
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
