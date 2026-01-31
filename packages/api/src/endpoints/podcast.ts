import { authFetch } from "../auth";

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

export const podcastApi = {
  async search(query: string, limit = 20) {
    const res = await authFetch(
      `/api/podcast/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
    if (!res.ok) throw new Error("Search failed");
    return res.json() as Promise<ItunesSearchResult[]>;
  },

  async getTrending(limit = 20) {
    const res = await authFetch(`/api/podcast/trending?limit=${limit}`);
    if (!res.ok) throw new Error("Trending failed");
    return res.json() as Promise<ItunesSearchResult[]>;
  },

  async getSubscriptions() {
    const res = await authFetch("/api/podcast/feeds");
    if (!res.ok) throw new Error("Failed to fetch subscriptions");
    return res.json() as Promise<PodcastFeed[]>;
  },

  async getFeed(feedId: number, limit = 50, offset = 0) {
    const res = await authFetch(
      `/api/podcast/feed/${feedId}?limit=${limit}&offset=${offset}`,
    );
    if (!res.ok) throw new Error("Failed to fetch feed");
    return res.json() as Promise<FeedDetailResponse>;
  },

  async getEpisode(episodeId: number) {
    const res = await authFetch("/api/podcast/episodes/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ episode_ids: [episodeId] }),
    });
    if (!res.ok) throw new Error("Failed to fetch episode");
    const episodes = await res.json();
    return episodes[0] as PodcastEpisode;
  },

  async subscribe(rssUrl: string) {
    const res = await authFetch("/api/podcast/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rss_url: rssUrl }),
    });
    if (!res.ok) throw new Error("Subscribe failed");
    return res.json() as Promise<PodcastFeed>;
  },

  async unsubscribe(feedId: number) {
    const res = await authFetch(`/api/podcast/feed/${feedId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Unsubscribe failed");
    return res.json();
  },

  async refreshFeed(feedId: number) {
    const res = await authFetch(`/api/podcast/feed/${feedId}/refresh`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Refresh failed");
    return res.json();
  },

  async getRecentlyPlayed() {
    const res = await authFetch("/api/podcast/recently-played");
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json() as Promise<PodcastEpisode[]>;
  },

  // Session Management
  session: {
    async start(episodeId: number) {
      const res = await authFetch("/api/podcast/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episodeId }),
      });
      return res.json();
    },

    async update(
      sessionId: number,
      totalListened: number,
      position: number,
      isFinished = false,
    ) {
      const res = await authFetch("/api/podcast/session/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          total_listened_seconds: totalListened,
          last_position_seconds: position,
          is_finished: isFinished,
        }),
      });
      return res.json();
    },

    async end(
      sessionId: number,
      totalListened: number,
      position: number,
      isFinished = false,
    ) {
      const res = await authFetch("/api/podcast/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          total_listened_seconds: totalListened,
          last_position_seconds: position,
          is_finished: isFinished,
        }),
      });
      return res.json();
    },
  },
};
