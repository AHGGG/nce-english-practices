import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Heart, Loader2, Trash2 } from "lucide-react";
import PodcastLayout from "../../components/podcast/PodcastLayout";
import PodcastCoverPlayButton from "../../components/podcast/PodcastCoverPlayButton";
import * as podcastApi from "../../api/podcast";
import { usePodcast } from "../../context/PodcastContext";
import { useToast } from "../../components/ui";

interface FavoriteItem {
  episode: {
    id: number;
    title: string;
    audio_url: string;
    image_url?: string | null;
    published_at?: string | null;
    duration_seconds?: number;
    current_position?: number;
  };
  feed: {
    id: number;
    title: string;
    image_url?: string | null;
  };
  favorited_at?: string;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PodcastFavoritesView() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { playEpisode, currentEpisode, isPlaying } = usePodcast();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Record<number, boolean>>({});

  async function loadFavorites() {
    try {
      setLoading(true);
      const data = (await podcastApi.getFavorites(200, 0)) as FavoriteItem[];
      setItems(data);
    } catch (error: unknown) {
      addToast("Failed to load favorites: " + getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFavorites();
  }, []);

  async function handleRemove(episodeId: number) {
    try {
      setRemoving((prev) => ({ ...prev, [episodeId]: true }));
      await podcastApi.removeFavoriteEpisode(episodeId);
      setItems((prev) => prev.filter((item) => item.episode.id !== episodeId));
      addToast("Removed from favorites", "info");
    } catch (error: unknown) {
      addToast("Failed to remove favorite: " + getErrorMessage(error), "error");
    } finally {
      setRemoving((prev) => ({ ...prev, [episodeId]: false }));
    }
  }

  return (
    <PodcastLayout title="Favorites">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Heart className="w-12 h-12 text-white/30 mx-auto" />
          <h3 className="text-lg text-white">No favorite episodes yet</h3>
          <p className="text-white/50 text-sm">
            Open a podcast feed and tap the heart icon on episodes.
          </p>
          <button
            onClick={() => navigate("/podcast")}
            className="px-5 py-2 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
          >
            Go to Library
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isCurrent = currentEpisode?.id === item.episode.id;
            const isCurrentAndPlaying = isCurrent && isPlaying;

            return (
              <div
                key={item.episode.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10"
              >
                <PodcastCoverPlayButton
                  imageUrl={item.episode.image_url || item.feed.image_url}
                  isCurrent={isCurrent}
                  isPlaying={isCurrentAndPlaying}
                  onClick={() => playEpisode(item.episode, item.feed, null)}
                  sizeClassName="w-14 h-14"
                  iconClassName="w-4 h-4"
                  fallbackIconClassName="w-5 h-5"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {item.episode.title}
                  </p>
                  <p className="text-white/50 text-xs truncate">
                    {item.feed.title}
                  </p>
                  <p className="text-white/40 text-[11px] mt-1">
                    {formatDate(item.episode.published_at)}
                  </p>
                </div>

                {isCurrent && (
                  <span className="px-2 py-1 rounded-md text-[10px] font-mono text-accent-primary border border-accent-primary/30 bg-accent-primary/10">
                    <Check className="w-3 h-3 inline mr-1" />
                    NOW
                  </span>
                )}

                <button
                  onClick={() => handleRemove(item.episode.id)}
                  disabled={removing[item.episode.id]}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  title="Remove favorite"
                >
                  {removing[item.episode.id] ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </PodcastLayout>
  );
}
