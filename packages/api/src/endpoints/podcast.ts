import { apiGet, apiPost, apiDelete } from "../auth";

export interface ItunesSearchResult {
  itunes_id?: number;
  title: string;
  author?: string;
  rss_url?: string;
  artwork_url?: string;
  genre?: string;
  episode_count?: number;
  is_subscribed: boolean;
}

export interface PodcastFeed {
  id: number;
  title: string;
  description?: string;
  author?: string;
  image_url?: string;
  rss_url: string;
  episode_count?: number;
  category?: string;
}

export interface PodcastEpisode {
  id: number;
  guid: string;
  title: string;
  description?: string;
  audio_url: string;
  duration_seconds?: number;
  image_url?: string;
  published_at?: string;
  transcript_status: string;
  current_position: number;
  is_finished: boolean;
}

export interface FeedDetailResponse {
  feed: PodcastFeed;
  episodes: PodcastEpisode[];
  is_subscribed: boolean;
  total_episodes: number;
}

export interface PodcastPlayerSegment {
  text: string;
  start_time: number;
  end_time: number;
  sentences?: string[];
}

export interface PodcastPlayerBundle {
  id: string;
  source_type: string;
  title: string;
  audio_url?: string;
  blocks: PodcastPlayerSegment[];
  metadata?: {
    feed_title?: string;
    current_position?: number;
    [key: string]: unknown;
  };
}

export const podcastApi = {
  async search(query: string, limit = 20) {
    return apiGet(
      `/api/podcast/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    ) as Promise<ItunesSearchResult[]>;
  },

  async getTrending(limit = 20) {
    return apiGet(`/api/podcast/trending?limit=${limit}`) as Promise<
      ItunesSearchResult[]
    >;
  },

  async getSubscriptions() {
    return apiGet("/api/podcast/feeds") as Promise<PodcastFeed[]>;
  },

  async getFeed(feedId: number, limit = 50, offset = 0) {
    return apiGet(
      `/api/podcast/feed/${feedId}?limit=${limit}&offset=${offset}`,
    ) as Promise<FeedDetailResponse>;
  },

  async getEpisode(episodeId: number) {
    const data = await apiPost("/api/podcast/episodes/batch", {
      episode_ids: [episodeId],
    });
    if (!data || data.length === 0) {
      throw new Error(`Episode ${episodeId} not found`);
    }
    // Backend returns nested {episode: {...}, feed: {...}}
    return data[0].episode as PodcastEpisode;
  },

  async preview(rssUrl: string) {
    return apiPost("/api/podcast/preview", {
      rss_url: rssUrl,
    }) as Promise<FeedDetailResponse>;
  },

  async subscribe(rssUrl: string) {
    return apiPost("/api/podcast/subscribe", {
      rss_url: rssUrl,
    }) as Promise<PodcastFeed>;
  },

  async unsubscribe(feedId: number) {
    return apiDelete(`/api/podcast/feed/${feedId}`);
  },

  async refreshFeed(feedId: number) {
    return apiPost(`/api/podcast/feed/${feedId}/refresh`, {});
  },

  async getRecentlyPlayed() {
    return apiGet("/api/podcast/recently-played") as Promise<PodcastEpisode[]>;
  },

  async getPlayerContent(episodeId: number) {
    return apiGet(
      `/api/content/player/podcast/${episodeId}`,
    ) as Promise<PodcastPlayerBundle>;
  },

  async transcribeEpisode(
    episodeId: number,
    force = false,
    remoteUrl?: string | null,
    apiKey?: string | null,
  ) {
    const payload: Record<string, unknown> = { force };
    if (remoteUrl && remoteUrl.trim().length > 0) {
      payload.remote_url = remoteUrl.trim();
    }
    if (apiKey && apiKey.trim().length > 0) {
      payload.api_key = apiKey.trim();
    }
    return apiPost(`/api/podcast/episode/${episodeId}/transcribe`, payload);
  },

  async syncPosition(
    episodeId: number,
    position: number,
    deviceId: string,
    deviceType: string = "mobile",
  ) {
    return apiPost(`/api/podcast/episode/${episodeId}/position/sync`, {
      position_seconds: position,
      device_id: deviceId,
      device_type: deviceType,
    });
  },

  // Session Management
  session: {
    async start(episodeId: number) {
      return apiPost("/api/podcast/session/start", { episode_id: episodeId });
    },

    async update(
      sessionId: number,
      totalListened: number,
      position: number,
      isFinished = false,
    ) {
      return apiPost("/api/podcast/session/update", {
        session_id: sessionId,
        total_listened_seconds: totalListened,
        last_position_seconds: position,
        is_finished: isFinished,
      });
    },

    async end(
      sessionId: number,
      totalListened: number,
      position: number,
      isFinished = false,
    ) {
      return apiPost("/api/podcast/session/end", {
        session_id: sessionId,
        total_listened_seconds: totalListened,
        last_position_seconds: position,
        is_finished: isFinished,
      });
    },
  },
};
