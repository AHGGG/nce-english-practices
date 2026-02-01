/**
 * Offline utilities for podcast caching.
 * Uses Cache API for audio storage and IndexedDB for metadata.
 */

// Cache name must match workbox config in vite.config.js
const PODCAST_AUDIO_CACHE = "podcast-audio-cache";

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
    console.error("[Offline] Failed to check cache:", error);
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
    console.log("[Offline] Created Object URL from cache:", url);
    return objectUrl;
  } catch (error) {
    console.error("[Offline] Failed to get cached audio:", error);
    return null;
  }
}

/**
 * Download an episode for offline playback using direct client-side download.
 * Avoids server bandwidth by downloading directly from the source.
 *
 * @param {number} episodeId - The episode ID
 * @param {string} audioUrl - The direct audio URL (required)
 * @param {function} onProgress - Optional progress callback (received, total)
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<boolean>} - True if download succeeded
 */
export async function downloadEpisodeForOffline(
  episodeId,
  audioUrl,
  onProgress,
  signal = null,
) {
  if (!audioUrl) {
    throw new Error("Audio URL is required for direct download");
  }

  try {
    console.log(`[Offline] Direct download from: ${audioUrl}`);

    const headResponse = await fetch(audioUrl, {
      method: "HEAD",
      mode: "cors",
      signal,
    });

    if (!headResponse.ok) {
      throw new Error(`HEAD request failed: ${headResponse.status}`);
    }

    const contentLength = headResponse.headers.get("content-length");
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
    const contentType =
      headResponse.headers.get("content-type") || "audio/mpeg";

    if (!totalSize) {
      throw new Error("Could not determine file size");
    }

    await performChunkedDownload(
      audioUrl,
      audioUrl,
      totalSize,
      contentType,
      onProgress,
      signal,
    );

    updateOfflineIndex(episodeId);
    console.log(`[Offline] Direct download successful for ${episodeId}`);
    return true;
  } catch (error) {
    if (signal?.aborted) {
      console.log("[Offline] Download cancelled by user");
    } else {
      console.error("[Offline] Direct download failed:", error);
    }
    throw error;
  }
}

/**
 * Helper to perform chunked download and cache storage.
 * @param {string} sourceUrl - URL to fetch from
 * @param {string} cacheKey - URL to use as cache key
 * @param {number} totalSize - Total file size
 * @param {string} contentType - Content Type
 * @param {function} onProgress - Progress callback
 * @param {AbortSignal} signal - Abort signal
 */
async function performChunkedDownload(
  sourceUrl,
  cacheKey,
  totalSize,
  contentType,
  onProgress,
  signal,
) {
  const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
  const chunks = [];
  let received = 0;

  for (let start = 0; start < totalSize; start += CHUNK_SIZE) {
    if (signal?.aborted) throw new Error("Download aborted");

    const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
    const range = `bytes=${start}-${end}`;

    let chunkData = null;
    let retries = 3;

    while (retries > 0) {
      try {
        const response = await fetch(sourceUrl, {
          headers: { Range: range },
          signal,
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
        await new Promise((r) => setTimeout(r, 1000 * (4 - retries)));
      }
    }

    chunks.push(chunkData);
    received += chunkData.size;
    if (onProgress) onProgress(received, totalSize);
  }

  // Assemble and Cache
  const fullBlob = new Blob(chunks, { type: contentType || "audio/mpeg" });
  const cacheResponse = new Response(fullBlob, {
    headers: {
      "content-length": totalSize.toString(),
      "content-type": contentType || "audio/mpeg",
    },
  });

  const cache = await caches.open(PODCAST_AUDIO_CACHE);
  await cache.put(cacheKey, cacheResponse);
}

/**
 * Helper to update offline episodes index in localStorage.
 */
function updateOfflineIndex(episodeId) {
  const offlineEpisodes = JSON.parse(
    localStorage.getItem("offline_episodes") || "[]",
  );
  if (!offlineEpisodes.includes(episodeId)) {
    offlineEpisodes.push(episodeId);
    localStorage.setItem("offline_episodes", JSON.stringify(offlineEpisodes));
  }
}

/**
 * Remove an episode from offline storage.
 * @param {number} episodeId - The episode ID
 * @param {string} proxyUrl - The cached URL
 * @returns {Promise<boolean>}
 */
export async function removeOfflineEpisode(episodeId, audioUrl) {
  try {
    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    await cache.delete(audioUrl);

    // Remove from localStorage
    const offlineEpisodes = JSON.parse(
      localStorage.getItem("offline_episodes") || "[]",
    );
    const updated = offlineEpisodes.filter((id) => id !== episodeId);
    localStorage.setItem("offline_episodes", JSON.stringify(updated));

    console.log(`[Offline] Episode ${episodeId} removed from cache`);
    return true;
  } catch (error) {
    console.error("[Offline] Remove failed:", error);
    return false;
  }
}

/**
 * Get list of episode IDs that are available offline.
 * @returns {number[]}
 */
export function getOfflineEpisodeIds() {
  try {
    return JSON.parse(localStorage.getItem("offline_episodes") || "[]");
  } catch {
    return [];
  }
}

/**
 * Get storage usage estimate.
 * @returns {Promise<{used: number, quota: number, usedMB: string, quotaMB: string}>}
 */
export async function getStorageEstimate() {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
      usedMB: ((estimate.usage || 0) / 1024 / 1024).toFixed(1),
      quotaMB: ((estimate.quota || 0) / 1024 / 1024).toFixed(0),
    };
  }
  return { used: 0, quota: 0, usedMB: "0", quotaMB: "Unknown" };
}

/**
 * Clear all cached podcast audio.
 * @returns {Promise<boolean>}
 */
export async function clearPodcastCache() {
  try {
    await caches.delete(PODCAST_AUDIO_CACHE);
    localStorage.removeItem("offline_episodes");
    console.log("[Offline] Podcast cache cleared");
    return true;
  } catch (error) {
    console.error("[Offline] Failed to clear cache:", error);
    return false;
  }
}
