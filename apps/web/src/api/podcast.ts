/**
 * Podcast API client.
 */

import { authFetch, apiDelete, apiGet, apiPost } from "./auth";

const BASE_URL = "/api/podcast";
const searchCache = new Map<string, { timestamp: number; data: unknown }>();
const CACHE_TTL = 5 * 60 * 1000;

interface SearchPodcastsOptions {
  limit?: number;
  country?: string;
  category?: string | null;
}

interface ImportOPMLProgress {
  type?: string;
  current?: number;
  total?: number;
  title?: string;
  success?: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
  failed?: number;
}

interface ImportOPMLResult {
  imported: number;
  skipped: number;
  failed: number;
  total: number;
}

interface PositionSyncData {
  position: number;
  isFinished?: boolean;
  duration?: number;
  timestamp?: string | number;
  deviceId?: string;
  deviceType?: string;
  playbackRate?: number;
}

interface ApiLikeError {
  status?: number;
  message?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export async function searchPodcasts(
  query: string,
  { limit = 20, country = "US", category = null }: SearchPodcastsOptions = {},
) {
  const cacheKey = JSON.stringify({ query, limit, country, category });
  const now = Date.now();

  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    searchCache.delete(cacheKey);
  }

  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    country,
  });
  if (category) params.append("category", category);

  const data = await apiGet(`${BASE_URL}/search?${params}`);

  if (searchCache.size > 20) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) {
      searchCache.delete(firstKey);
    }
  }
  searchCache.set(cacheKey, { timestamp: now, data });

  return data;
}

export async function getTrendingPodcasts({
  limit = 100,
  country = "US",
  category = null,
}: SearchPodcastsOptions = {}) {
  const params = new URLSearchParams({ limit: String(limit), country });
  if (category) params.append("category", category);
  return apiGet(`${BASE_URL}/trending?${params}`);
}

export async function getCategories() {
  return apiGet(`${BASE_URL}/categories`);
}

export async function previewPodcast(rssUrl: string) {
  return apiPost(`${BASE_URL}/preview`, { rss_url: rssUrl });
}

export async function subscribeToPodcast(rssUrl: string) {
  return apiPost(`${BASE_URL}/subscribe`, { rss_url: rssUrl });
}

export async function unsubscribeFromPodcast(feedId: number) {
  return apiDelete(`${BASE_URL}/feed/${feedId}`);
}

export async function getSubscriptions() {
  return apiGet(`${BASE_URL}/feeds`);
}

export async function getFeedDetail(feedId: number, limit = 50, offset = 0) {
  return apiGet(`${BASE_URL}/feed/${feedId}?limit=${limit}&offset=${offset}`);
}

export async function refreshFeed(feedId: number) {
  return apiPost(`${BASE_URL}/feed/${feedId}/refresh`);
}

export async function importOPML(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authFetch(`${BASE_URL}/opml/import`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("Import failed");
  return response.json();
}

export async function importOPMLStreaming(
  file: File,
  onProgress?: (progress: ImportOPMLProgress) => void,
): Promise<ImportOPMLResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await authFetch(`${BASE_URL}/opml/import/stream`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Import failed" }));
    if (isRecord(error) && typeof error.detail === "string") {
      throw new Error(error.detail);
    }
    throw new Error("Import failed");
  }

  if (!response.body) {
    throw new Error("Streaming body not available");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ImportOPMLResult = {
    imported: 0,
    skipped: 0,
    failed: 0,
    total: 0,
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      try {
        const data = JSON.parse(line.slice(6)) as ImportOPMLProgress;
        onProgress?.(data);

        if (data.type === "complete") {
          result = {
            imported: typeof data.imported === "number" ? data.imported : 0,
            skipped: typeof data.skipped === "number" ? data.skipped : 0,
            failed: typeof data.failed === "number" ? data.failed : 0,
            total: typeof data.total === "number" ? data.total : 0,
          };
        }
      } catch (error) {
        console.error("SSE parse error:", error);
      }
    }
  }

  return result;
}

export async function exportOPML() {
  const response = await authFetch(`${BASE_URL}/opml/export`);
  if (!response.ok) throw new Error("Export failed");
  return response.blob();
}

export async function startListeningSession(episodeId: number) {
  return apiPost(`${BASE_URL}/session/start`, { episode_id: episodeId });
}

export async function updateListeningSession(
  sessionId: number,
  totalSeconds: number,
  position: number,
  isFinished = false,
) {
  return apiPost(`${BASE_URL}/session/update`, {
    session_id: sessionId,
    total_listened_seconds: Math.floor(totalSeconds),
    last_position_seconds: position,
    is_finished: isFinished,
  });
}

export async function endListeningSession(
  sessionId: number,
  totalSeconds: number,
  position: number,
  isFinished = false,
) {
  return apiPost(`${BASE_URL}/session/end`, {
    session_id: sessionId,
    total_listened_seconds: Math.floor(totalSeconds),
    last_position_seconds: position,
    is_finished: isFinished,
  });
}

export async function getEpisodePosition(episodeId: number) {
  return apiGet(`${BASE_URL}/episode/${episodeId}/position`);
}

export async function syncPosition(episodeId: number, data: PositionSyncData) {
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

export async function transcribeEpisode(
  episodeId: number,
  force = false,
  remoteUrl: string | null = null,
  apiKey: string | null = null,
) {
  try {
    return await apiPost(`${BASE_URL}/episode/${episodeId}/transcribe`, {
      force,
      remote_url: remoteUrl || undefined,
      api_key: apiKey || undefined,
    });
  } catch (error: unknown) {
    const apiError = error as ApiLikeError;
    if (apiError.status === 409) {
      return {
        status: "in_progress",
        message: apiError.message || "Transcription already in progress",
      };
    }
    throw error;
  }
}

export async function getRecentlyPlayed(limit = 10) {
  return apiGet(`${BASE_URL}/recently-played?limit=${limit}`);
}

export async function checkEpisodeSizes(episodeIds: number[]) {
  return apiPost(`${BASE_URL}/episodes/check-size`, {
    episode_ids: episodeIds,
  });
}

export async function downloadEpisode(episodeId: number) {
  const response = await authFetch(`${BASE_URL}/episode/${episodeId}/download`);
  if (!response.ok) throw new Error("Download failed");
  return response.blob();
}

export async function getEpisodeDetail(episodeId: number) {
  return apiGet(`${BASE_URL}/episode/${episodeId}`);
}

export async function getEpisodesBatch(episodeIds: number[]) {
  return apiPost(`${BASE_URL}/episodes/batch`, { episode_ids: episodeIds });
}

export async function resolvePosition(
  episodeId: number,
  data: Record<string, unknown>,
) {
  return apiPost(`${BASE_URL}/episode/${episodeId}/position/resolve`, data);
}
