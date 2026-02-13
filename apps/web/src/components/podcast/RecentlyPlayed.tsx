/**
 * RecentlyPlayed - Shows episodes with incomplete playback for quick resume.
 */

import { useState, useEffect } from "react";
import { Play, Clock, Loader2 } from "lucide-react";
import * as podcastApi from "../../api/podcast";
import type { PodcastEpisode, PodcastFeed } from "../../context/PodcastContext";
import { usePodcast } from "../../context/PodcastContext";

interface RecentlyPlayedItem {
  episode: PodcastEpisode & {
    duration_seconds?: number;
  };
  feed: PodcastFeed;
  last_position_seconds?: number;
}

function formatTime(seconds: number) {
  if (!seconds || !isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatProgress(position: number, duration: number) {
  if (!duration) return 0;
  return Math.min(100, Math.round((position / duration) * 100));
}

export default function RecentlyPlayed() {
  const { playEpisode, currentEpisode, currentTime, duration } = usePodcast();
  const [items, setItems] = useState<RecentlyPlayedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadRecentlyPlayed();
  }, []);

  async function loadRecentlyPlayed() {
    try {
      setLoading(true);
      const data = (await podcastApi.getRecentlyPlayed(
        5,
      )) as RecentlyPlayedItem[];

      const filtered = data.filter((item) => {
        const position = item.last_position_seconds || 0;
        const itemDuration = item.episode.duration_seconds || 0;
        if (!itemDuration) return true;
        const remaining = Math.max(0, itemDuration - position);
        return remaining > 10;
      });

      setItems(filtered);
    } catch (error) {
      console.error("Failed to load recently played:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleResume(item: RecentlyPlayedItem) {
    const episode: PodcastEpisode = {
      id: item.episode.id,
      title: item.episode.title,
      audio_url: item.episode.audio_url,
      image_url: item.episode.image_url,
    };
    const feed: PodcastFeed = {
      id: item.feed.id,
      title: item.feed.title,
      image_url: item.feed.image_url,
    };
    void playEpisode(episode, feed, item.last_position_seconds ?? 0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-accent-primary" />
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">
          Continue Listening
        </h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
        {items.map((item) => {
          const isCurrentEp = currentEpisode?.id === item.episode.id;
          const coverImage =
            item.episode.image_url ?? item.feed.image_url ?? undefined;

          const position = isCurrentEp
            ? currentTime
            : (item.last_position_seconds ?? 0);
          const episodeDuration =
            isCurrentEp && duration > 0
              ? duration
              : (item.episode.duration_seconds ?? 0);

          const progress = formatProgress(position, episodeDuration);
          const remainingTime = Math.max(0, episodeDuration - position);

          return (
            <button
              key={item.episode.id}
              onClick={() => handleResume(item)}
              className={`flex-shrink-0 w-32 sm:w-48 bg-bg-surface border rounded-xl overflow-hidden hover:border-accent-primary/50 transition-all group ${isCurrentEp ? "border-accent-primary" : "border-border"}`}
            >
              <div className="relative aspect-square">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                    <Play className="w-8 h-8 text-text-muted" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-accent-primary rounded-full flex items-center justify-center">
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-black ml-0.5" />
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-base/80">
                  <div
                    className="h-full bg-accent-primary"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>

              <div className="p-2 sm:p-3 text-left">
                <p className="text-xs sm:text-sm font-medium text-text-primary truncate">
                  {item.episode.title}
                </p>
                <p className="text-[10px] sm:text-xs text-text-muted truncate">
                  {item.feed.title}
                </p>
                <p className="text-[10px] sm:text-xs text-accent-primary/70 font-mono mt-0.5 sm:mt-1">
                  {remainingTime > 0
                    ? `${formatTime(remainingTime)} left`
                    : "✓ Completed"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
