import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  ChevronLeft,
  Check,
  Download,
  Heart,
  ListPlus,
  Loader2,
} from "lucide-react";
import PodcastLayout from "../../components/podcast/PodcastLayout";
import PodcastCoverPlayButton from "../../components/podcast/PodcastCoverPlayButton";
import PodcastEpisodeActionButtons, {
  type PodcastEpisodeActionItem,
} from "../../components/podcast/PodcastEpisodeActionButtons";
import EpisodeSwipeCard, {
  shouldShowSwipeHint,
  type SwipeAction,
} from "../../components/podcast/EpisodeSwipeCard";
import PlaylistPickerDialog from "../../components/podcast/PlaylistPickerDialog";
import * as podcastApi from "../../api/podcast";
import { usePodcast } from "../../context/PodcastContext";
import { useGlobalState } from "../../context/GlobalContext";
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
    transcript_status?: string;
  };
  feed: {
    id: number;
    title: string;
    image_url?: string | null;
  };
  favorited_at?: string;
}

interface PodcastFeed {
  id: number;
  title: string;
  image_url?: string | null;
}

interface PodcastEpisode {
  id: number;
  title: string;
  audio_url: string;
  image_url?: string | null;
  duration_seconds?: number;
  current_position?: number;
  transcript_status?: string;
}

interface DownloadItemState {
  status: "idle" | "downloading" | "done" | "error";
  progress: number;
  error?: string;
}

interface PodcastContextValue {
  playEpisode: (
    episode: PodcastEpisode,
    feed: PodcastFeed,
    start: number | null,
  ) => void;
  currentEpisode: PodcastEpisode | null;
  isPlaying: boolean;
  offlineEpisodes: Set<number>;
  downloadState: Record<number, DownloadItemState>;
  startDownload: (episode: PodcastEpisode) => Promise<void>;
  removeDownload: (episodeId: number, audioUrl: string) => Promise<boolean>;
  cancelDownload: (episodeId: number) => void;
}

interface GlobalSettings {
  transcriptionRemoteEnabled?: boolean;
  transcriptionRemoteUrl?: string;
  transcriptionRemoteApiKey?: string;
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
  const {
    playEpisode,
    currentEpisode,
    isPlaying,
    offlineEpisodes,
    downloadState,
    startDownload,
    removeDownload,
    cancelDownload,
  } = usePodcast() as PodcastContextValue;
  const {
    state: { settings },
  } = useGlobalState() as { state: { settings: GlobalSettings } };
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState<
    Record<number, boolean>
  >({});
  const [downloadLoading, setDownloadLoading] = useState<
    Record<number, boolean>
  >({});
  const [transcriptStatus, setTranscriptStatus] = useState<
    Record<number, string>
  >({});
  const [playlistDialogEpisode, setPlaylistDialogEpisode] =
    useState<PodcastEpisode | null>(null);
  const [sortMode, setSortMode] = useState<"favorite-time" | "channel-grouped">(
    "favorite-time",
  );
  const [swipedEpisodeId, setSwipedEpisodeId] = useState<number | null>(null);
  const [showSwipeHint] = useState(shouldShowSwipeHint);

  const favoritesByTime = useMemo(() => {
    return [...items].sort((a, b) => {
      const left = a.favorited_at ? Date.parse(a.favorited_at) : 0;
      const right = b.favorited_at ? Date.parse(b.favorited_at) : 0;
      return right - left;
    });
  }, [items]);

  const favoritesGroupedByChannel = useMemo(() => {
    const groups = new Map<
      number,
      {
        feed: FavoriteItem["feed"];
        items: FavoriteItem[];
        latestFavoritedAt: number;
      }
    >();

    for (const item of favoritesByTime) {
      const feedId = item.feed.id;
      const favoritedAt = item.favorited_at ? Date.parse(item.favorited_at) : 0;
      const group = groups.get(feedId);
      if (!group) {
        groups.set(feedId, {
          feed: item.feed,
          items: [item],
          latestFavoritedAt: favoritedAt,
        });
        continue;
      }
      group.items.push(item);
      group.latestFavoritedAt = Math.max(group.latestFavoritedAt, favoritedAt);
    }

    return [...groups.values()].sort((a, b) => {
      if (b.latestFavoritedAt !== a.latestFavoritedAt) {
        return b.latestFavoritedAt - a.latestFavoritedAt;
      }
      return a.feed.title.localeCompare(b.feed.title);
    });
  }, [favoritesByTime]);

  function buildMetaText(item: FavoriteItem) {
    const favoritedAt = formatDate(item.favorited_at);
    const publishedAt = formatDate(item.episode.published_at);
    if (favoritedAt && publishedAt) {
      return `Favorited ${favoritedAt} · Published ${publishedAt}`;
    }
    if (favoritedAt) {
      return `Favorited ${favoritedAt}`;
    }
    if (publishedAt) {
      return `Published ${publishedAt}`;
    }
    return "";
  }

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const data = (await podcastApi.getFavorites(200, 0)) as FavoriteItem[];
      setItems(data);
    } catch (error: unknown) {
      addToast("Failed to load favorites: " + getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  async function handleToggleFavorite(episodeId: number) {
    try {
      setFavoriteLoading((prev) => ({ ...prev, [episodeId]: true }));
      await podcastApi.removeFavoriteEpisode(episodeId);
      setItems((prev) => prev.filter((item) => item.episode.id !== episodeId));
      addToast("Removed from favorites", "info");
    } catch (error: unknown) {
      addToast("Failed to remove favorite: " + getErrorMessage(error), "error");
    } finally {
      setFavoriteLoading((prev) => ({ ...prev, [episodeId]: false }));
    }
  }

  const pollTranscriptStatus = useCallback(
    async (episodeId: number) => {
      const poll = async () => {
        try {
          const rows = (await podcastApi.getEpisodesBatch([
            episodeId,
          ])) as Array<{
            episode?: { transcript_status?: string };
            transcript_status?: string;
          }>;
          const status =
            rows?.[0]?.episode?.transcript_status ||
            rows?.[0]?.transcript_status ||
            "none";

          setTranscriptStatus((prev) => ({ ...prev, [episodeId]: status }));
          setItems((prev) =>
            prev.map((item) =>
              item.episode.id === episodeId
                ? {
                    ...item,
                    episode: { ...item.episode, transcript_status: status },
                  }
                : item,
            ),
          );

          if (status === "completed") {
            addToast("Transcription complete", "success");
            return;
          }
          if (status === "failed") {
            addToast("Transcription failed", "error");
            return;
          }
          if (status === "pending" || status === "processing") {
            setTimeout(poll, 5000);
          }
        } catch {
          addToast("Failed to refresh transcription status", "error");
        }
      };

      void poll();
    },
    [addToast],
  );

  const handleIntensiveListening = useCallback(
    async (episode: PodcastEpisode, forceRestart = false) => {
      const status =
        episode.transcript_status || transcriptStatus[episode.id] || "none";
      if (status === "completed") {
        navigate(`/player/podcast/${episode.id}`);
        return;
      }

      if ((status === "pending" || status === "processing") && !forceRestart) {
        addToast("Transcription in progress", "info");
        return;
      }

      try {
        setTranscriptStatus((prev) => ({ ...prev, [episode.id]: "pending" }));
        const remoteUrl = settings?.transcriptionRemoteEnabled
          ? settings.transcriptionRemoteUrl
          : null;
        const apiKey = settings?.transcriptionRemoteEnabled
          ? settings.transcriptionRemoteApiKey
          : null;

        const result = await podcastApi.transcribeEpisode(
          episode.id,
          forceRestart,
          remoteUrl,
          apiKey,
        );
        addToast(result.message || "Transcription started", "success");
        void pollTranscriptStatus(episode.id);
      } catch (error: unknown) {
        setTranscriptStatus((prev) => ({ ...prev, [episode.id]: "failed" }));
        addToast(
          "Failed to start transcription: " + getErrorMessage(error),
          "error",
        );
      }
    },
    [
      addToast,
      navigate,
      pollTranscriptStatus,
      settings?.transcriptionRemoteApiKey,
      settings?.transcriptionRemoteEnabled,
      settings?.transcriptionRemoteUrl,
      transcriptStatus,
    ],
  );

  async function handleDownloadAction(item: FavoriteItem) {
    const episodeId = item.episode.id;
    const dState = downloadState[episodeId];
    if (dState?.status === "downloading") {
      cancelDownload(episodeId);
      addToast("Download cancelled", "info");
      return;
    }

    try {
      setDownloadLoading((prev) => ({ ...prev, [episodeId]: true }));
      if (offlineEpisodes.has(episodeId)) {
        const success = await removeDownload(episodeId, item.episode.audio_url);
        if (success) {
          addToast("Removed download", "info");
        } else {
          addToast("Failed to remove download", "error");
        }
        return;
      }

      await startDownload(item.episode);
      addToast("Download started", "success");
    } catch (error: unknown) {
      addToast("Download action failed: " + getErrorMessage(error), "error");
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [episodeId]: false }));
    }
  }

  function buildEpisodeActions(item: FavoriteItem): PodcastEpisodeActionItem[] {
    const episodeId = item.episode.id;
    const dState = downloadState[episodeId];
    const isDownloading = dState?.status === "downloading";
    const isDownloaded = offlineEpisodes.has(episodeId);
    const tStatus =
      item.episode.transcript_status || transcriptStatus[episodeId] || "none";

    return [
      {
        key: `favorite-${episodeId}`,
        onClick: (e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          void handleToggleFavorite(episodeId);
        },
        disabled: favoriteLoading[episodeId],
        className:
          "border border-transparent text-red-400 hover:bg-red-500/10 hover:border-red-500/30",
        title: "Remove from favorites",
        icon: favoriteLoading[episodeId] ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Heart className="w-5 h-5" fill="currentColor" />
        ),
      },
      {
        key: `playlist-${episodeId}`,
        onClick: (e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          setPlaylistDialogEpisode(item.episode);
        },
        className:
          "border border-transparent text-white/30 hover:text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary/20",
        title: "Add to playlist",
        icon: <ListPlus className="w-5 h-5" />,
      },
      {
        key: `intensive-${episodeId}`,
        onClick: (e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          void handleIntensiveListening(
            item.episode,
            tStatus === "pending" || tStatus === "processing",
          );
        },
        disabled: isDownloading,
        className:
          tStatus === "completed"
            ? "border border-transparent text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary/20"
            : tStatus === "pending" || tStatus === "processing"
              ? "border border-transparent text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/20"
              : "border border-transparent text-white/30 hover:text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary/20",
        title:
          tStatus === "completed"
            ? "Enter intensive listening"
            : tStatus === "pending" || tStatus === "processing"
              ? "Transcription in progress (click to restart)"
              : "Generate transcript",
        icon:
          tStatus === "pending" || tStatus === "processing" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <BookOpen className="w-5 h-5" />
          ),
      },
      {
        key: `download-${episodeId}`,
        onClick: (e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          void handleDownloadAction(item);
        },
        disabled: downloadLoading[episodeId],
        className: isDownloaded
          ? "border border-transparent text-accent-success hover:bg-accent-success/10 hover:border-accent-success/30"
          : "border border-transparent text-white/30 hover:text-accent-primary hover:bg-accent-primary/10 hover:border-accent-primary/20",
        title: isDownloading
          ? "Cancel download"
          : isDownloaded
            ? "Remove download"
            : "Download episode",
        icon:
          downloadLoading[episodeId] || isDownloading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          ),
      },
    ];
  }

  function buildMobileActions(item: FavoriteItem): SwipeAction[] {
    const episodeId = item.episode.id;
    const dState = downloadState[episodeId];
    const isDownloading = dState?.status === "downloading";
    const isDownloaded = offlineEpisodes.has(episodeId);
    const tStatus =
      item.episode.transcript_status || transcriptStatus[episodeId] || "none";

    return [
      {
        icon: favoriteLoading[episodeId] ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Heart className="w-4 h-4" fill="currentColor" />
        ),
        onClick: () => {
          setSwipedEpisodeId(null);
          void handleToggleFavorite(episodeId);
        },
        disabled: favoriteLoading[episodeId],
        className: "text-red-400 bg-red-500/10 border-red-500/25 border",
        title: "Remove from favorites",
      },
      {
        icon: <ListPlus className="w-4 h-4" />,
        onClick: () => {
          setSwipedEpisodeId(null);
          setPlaylistDialogEpisode(item.episode);
        },
        className: "text-white/70 bg-white/5 border-white/10 border",
        title: "Add to playlist",
      },
      {
        icon:
          tStatus === "pending" || tStatus === "processing" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BookOpen className="w-4 h-4" />
          ),
        onClick: () => {
          setSwipedEpisodeId(null);
          void handleIntensiveListening(
            item.episode,
            tStatus === "pending" || tStatus === "processing",
          );
        },
        disabled: isDownloading,
        className: isDownloading
          ? "text-white/20 bg-white/5 border-white/5 border"
          : tStatus === "completed"
            ? "text-accent-primary bg-accent-primary/10 border-accent-primary/25 border"
            : tStatus === "pending" || tStatus === "processing"
              ? "text-amber-300 bg-amber-500/10 border-amber-500/25 border"
              : "text-white/35 bg-white/5 border-white/10 border",
        title:
          tStatus === "completed"
            ? "Enter intensive listening"
            : tStatus === "pending" || tStatus === "processing"
              ? "Transcription in progress (click to restart)"
              : "Generate transcript",
      },
      {
        icon:
          downloadLoading[episodeId] || isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          ),
        onClick: () => {
          setSwipedEpisodeId(null);
          void handleDownloadAction(item);
        },
        disabled: downloadLoading[episodeId],
        className: isDownloaded
          ? "text-accent-success bg-accent-success/10 border-accent-success/25 border"
          : "text-white/60 bg-white/5 border-white/10 border",
        title: isDownloading
          ? "Cancel download"
          : isDownloaded
            ? "Remove download"
            : "Download episode",
      },
    ];
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
          {showSwipeHint && (
            <div className="sm:hidden flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-white/45 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2">
              <ChevronLeft className="w-3.5 h-3.5" />
              Swipe left on an episode for quick actions
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSortMode("favorite-time")}
              className={`px-3 py-1.5 rounded-lg border text-xs transition ${
                sortMode === "favorite-time"
                  ? "border-accent-primary/50 text-accent-primary bg-accent-primary/10"
                  : "border-white/15 text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              By favorite time
            </button>
            <button
              onClick={() => setSortMode("channel-grouped")}
              className={`px-3 py-1.5 rounded-lg border text-xs transition ${
                sortMode === "channel-grouped"
                  ? "border-accent-primary/50 text-accent-primary bg-accent-primary/10"
                  : "border-white/15 text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              Group by channel
            </button>
          </div>

          {sortMode === "favorite-time" &&
            favoritesByTime.map((item) => {
              const isCurrent = currentEpisode?.id === item.episode.id;
              const isCurrentAndPlaying = isCurrent && isPlaying;

              return (
                <EpisodeSwipeCard
                  key={item.episode.id}
                  episodeId={item.episode.id}
                  actions={buildMobileActions(item)}
                  expandedId={swipedEpisodeId}
                  onExpandedChange={(id) =>
                    setSwipedEpisodeId(typeof id === "number" ? id : null)
                  }
                  showSwipeHint={showSwipeHint}
                  className="bg-white/[0.02] border border-white/10"
                >
                  <div className="flex items-center gap-4 p-4">
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
                        {buildMetaText(item)}
                      </p>
                    </div>

                    {isCurrent && (
                      <span className="px-2 py-1 rounded-md text-[10px] font-mono text-accent-primary border border-accent-primary/30 bg-accent-primary/10">
                        <Check className="w-3 h-3 inline mr-1" />
                        NOW
                      </span>
                    )}

                    <PodcastEpisodeActionButtons
                      actions={buildEpisodeActions(item)}
                    />
                  </div>
                </EpisodeSwipeCard>
              );
            })}

          {sortMode === "channel-grouped" &&
            favoritesGroupedByChannel.map((group) => (
              <div
                key={group.feed.id}
                className="rounded-xl border border-white/10 bg-white/[0.02]"
              >
                <div className="px-4 py-3 border-b border-white/10 text-sm text-white/90 flex items-center justify-between gap-3">
                  <span className="truncate">{group.feed.title}</span>
                  <span className="text-xs text-white/50 shrink-0">
                    {group.items.length} favorites
                  </span>
                </div>

                <div className="p-3 space-y-3">
                  {group.items.map((item) => {
                    const isCurrent = currentEpisode?.id === item.episode.id;
                    const isCurrentAndPlaying = isCurrent && isPlaying;

                    return (
                      <EpisodeSwipeCard
                        key={item.episode.id}
                        episodeId={item.episode.id}
                        actions={buildMobileActions(item)}
                        expandedId={swipedEpisodeId}
                        onExpandedChange={(id) =>
                          setSwipedEpisodeId(typeof id === "number" ? id : null)
                        }
                        showSwipeHint={showSwipeHint}
                        className="bg-white/[0.02] border border-white/10"
                      >
                        <div className="flex items-center gap-4 p-3">
                          <PodcastCoverPlayButton
                            imageUrl={
                              item.episode.image_url || item.feed.image_url
                            }
                            isCurrent={isCurrent}
                            isPlaying={isCurrentAndPlaying}
                            onClick={() =>
                              playEpisode(item.episode, item.feed, null)
                            }
                            sizeClassName="w-14 h-14"
                            iconClassName="w-4 h-4"
                            fallbackIconClassName="w-5 h-5"
                          />

                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {item.episode.title}
                            </p>
                            <p className="text-white/40 text-[11px] mt-1">
                              {buildMetaText(item)}
                            </p>
                          </div>

                          {isCurrent && (
                            <span className="px-2 py-1 rounded-md text-[10px] font-mono text-accent-primary border border-accent-primary/30 bg-accent-primary/10">
                              <Check className="w-3 h-3 inline mr-1" />
                              NOW
                            </span>
                          )}

                          <PodcastEpisodeActionButtons
                            actions={buildEpisodeActions(item)}
                          />
                        </div>
                      </EpisodeSwipeCard>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      <PlaylistPickerDialog
        isOpen={playlistDialogEpisode !== null}
        onClose={() => setPlaylistDialogEpisode(null)}
        episodeId={playlistDialogEpisode?.id ?? null}
        episodeTitle={playlistDialogEpisode?.title}
      />
    </PodcastLayout>
  );
}
