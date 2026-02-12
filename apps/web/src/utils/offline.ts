/**
 * Offline utilities for podcast caching.
 * Uses Cache API for audio storage and IndexedDB for metadata.
 */

const PODCAST_AUDIO_CACHE = "podcast-audio-cache";

type ProgressCallback = (received: number, total: number) => void;

interface StorageEstimateResult {
  used: number;
  quota: number;
  usedMB: string;
  quotaMB: string;
}

export async function isEpisodeOffline(url: string) {
  try {
    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    const response = await cache.match(url);
    return Boolean(response);
  } catch (error) {
    console.error("[Offline] Failed to check cache:", error);
    return false;
  }
}

export async function getCachedAudioUrl(url: string) {
  try {
    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    const response = await cache.match(url);
    if (!response) return null;

    if (response.type === "opaque") {
      console.log(
        "[Offline] Opaque response found, delegating to Service Worker",
      );
      return null;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    console.log("[Offline] Created Object URL from cache:", url);
    return objectUrl;
  } catch (error) {
    console.error("[Offline] Failed to get cached audio:", error);
    return null;
  }
}

export async function downloadEpisodeForOffline(
  episodeId: number,
  audioUrl: string,
  onProgress?: ProgressCallback,
  signal: AbortSignal | null = null,
  knownFileSize: number | null = null,
) {
  if (!audioUrl) {
    throw new Error("Audio URL is required for direct download");
  }

  try {
    console.log(`[Offline] Attempting direct CORS download from: ${audioUrl}`);

    try {
      let totalSize = knownFileSize;

      if (!totalSize) {
        const headResponse = await fetch(audioUrl, {
          method: "HEAD",
          mode: "cors",
          signal: signal || undefined,
        });

        if (headResponse.ok) {
          const contentLength = headResponse.headers.get("content-length");
          totalSize = contentLength ? Number.parseInt(contentLength, 10) : 0;
        }
      }

      if (typeof totalSize === "number" && totalSize > 0) {
        await performChunkedDownload(
          audioUrl,
          audioUrl,
          totalSize,
          "audio/mpeg",
          onProgress,
          signal,
        );
        updateOfflineIndex(episodeId);
        console.log(`[Offline] Direct download successful for ${episodeId}`);
        return true;
      }
    } catch (corsError) {
      if (signal?.aborted) throw corsError;
      console.warn(
        `[Offline] CORS/HEAD download failed for ${episodeId}, falling back to opaque download.`,
        corsError,
      );
    }

    console.log(
      `[Offline] Attempting opaque (no-cors) download for: ${audioUrl}`,
    );
    await performOpaqueDownload(audioUrl, audioUrl, onProgress, signal);

    updateOfflineIndex(episodeId);
    console.log(`[Offline] Opaque download successful for ${episodeId}`);
    return true;
  } catch (error) {
    if (signal?.aborted) {
      console.log("[Offline] Download cancelled by user");
    } else {
      console.error("[Offline] Download failed:", error);
    }
    throw error;
  }
}

async function performOpaqueDownload(
  sourceUrl: string,
  cacheKey: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal | null,
) {
  const cache = await caches.open(PODCAST_AUDIO_CACHE);

  if (onProgress) onProgress(1, 100);

  const response = await fetch(sourceUrl, {
    mode: "no-cors",
    signal: signal || undefined,
  });

  await cache.put(cacheKey, response);
  if (onProgress) onProgress(100, 100);
}

async function performChunkedDownload(
  sourceUrl: string,
  cacheKey: string,
  totalSize: number,
  contentType: string,
  onProgress?: ProgressCallback,
  signal?: AbortSignal | null,
) {
  const CHUNK_SIZE = 3 * 1024 * 1024;
  const chunks: Blob[] = [];
  let received = 0;

  for (let start = 0; start < totalSize; start += CHUNK_SIZE) {
    if (signal?.aborted) throw new Error("Download aborted");

    const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
    const range = `bytes=${start}-${end}`;

    let chunkData: Blob | null = null;
    let retries = 3;

    while (retries > 0) {
      try {
        const response = await fetch(sourceUrl, {
          headers: { Range: range },
          signal: signal || undefined,
        });

        if (!response.ok && response.status !== 206) {
          throw new Error(`Chunk failed: ${response.status}`);
        }

        chunkData = await response.blob();
        break;
      } catch (error) {
        if (signal?.aborted) throw error;
        console.warn(
          `[Offline] Chunk retry ${4 - retries} for ${range}`,
          error,
        );
        retries -= 1;
        if (retries === 0) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (4 - retries)),
        );
      }
    }

    if (!chunkData) {
      throw new Error("Chunk download failed");
    }

    chunks.push(chunkData);
    received += chunkData.size;
    onProgress?.(received, totalSize);
  }

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

function updateOfflineIndex(episodeId: number) {
  const offlineEpisodes = JSON.parse(
    localStorage.getItem("offline_episodes") || "[]",
  ) as number[];
  if (!offlineEpisodes.includes(episodeId)) {
    offlineEpisodes.push(episodeId);
    localStorage.setItem("offline_episodes", JSON.stringify(offlineEpisodes));
  }
}

export async function removeOfflineEpisode(
  episodeId: number,
  audioUrl: string,
) {
  try {
    const cache = await caches.open(PODCAST_AUDIO_CACHE);
    await cache.delete(audioUrl);

    const offlineEpisodes = JSON.parse(
      localStorage.getItem("offline_episodes") || "[]",
    ) as number[];
    const updated = offlineEpisodes.filter((id) => id !== episodeId);
    localStorage.setItem("offline_episodes", JSON.stringify(updated));

    console.log(`[Offline] Episode ${episodeId} removed from cache`);
    return true;
  } catch (error) {
    console.error("[Offline] Remove failed:", error);
    return false;
  }
}

export function getOfflineEpisodeIds() {
  try {
    return JSON.parse(
      localStorage.getItem("offline_episodes") || "[]",
    ) as number[];
  } catch {
    return [];
  }
}

export async function getStorageEstimate(): Promise<StorageEstimateResult> {
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
