import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  Heart,
  ListPlus,
  Loader2,
} from "lucide-react";
import PodcastLayout from "../../components/podcast/PodcastLayout";
import PodcastCoverPlayButton from "../../components/podcast/PodcastCoverPlayButton";
import PlaylistPickerDialog from "../../components/podcast/PlaylistPickerDialog";
import EpisodeSwipeCard, {
  shouldShowSwipeHint,
  type SwipeAction,
} from "../../components/podcast/EpisodeSwipeCard";
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
    file_size?: number;
    is_finished?: boolean;
    transcript_status?: string;
  };
  feed: {
    id: number;
    title: string;
    image_url?: string | null;
  };
  favorited_at?: string;
}

interface DownloadItemState {
  status: "idle" | "downloading" | "done" | "error";
  progress: number;
  error?: string;
}

interface GlobalSettings {
  transcriptionRemoteEnabled?: boolean;
  transcriptionRemoteUrl?: string;
  transcriptionRemoteApiKey?: string;
}

interface PodcastContextValue {
  currentEpisode: FavoriteItem["episode"] | null;
  isPlaying: boolean;
  playEpisode: (
    episode: FavoriteItem["episode"],
    feed: FavoriteItem["feed"],
    start: number | null,
  ) => void;
  startDownload: (episode: FavoriteItem["episode"]) => Promise<void>;
  cancelDownload: (episodeId: number) => void;
  removeDownload: (episodeId: number, audioUrl: string) => Promise<boolean>;
  downloadState: Record<number, DownloadItemState>;
  offlineEpisodes: Set<number>;
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
    startDownload,
    cancelDownload,
    removeDownload,
    downloadState,
    offlineEpisodes,
  } = usePodcast() as PodcastContextValue;
  const {
    state: { settings },
  } = useGlobalState() as { state: { settings: GlobalSettings } };
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedOnce = useRef(false);
  const [removing, setRemoving] = useState<Record<number, boolean>>({});
  const [transcriptStatus, setTranscriptStatus] = useState<
    Record<number, string>
  >({});
  const [playlistDialogEpisode, setPlaylistDialogEpisode] = useState<
    FavoriteItem["episode"] | null
  >(null);
  const [swipedEpisodeId, setSwipedEpisodeId] = useState<
    number | string | null
  >(null);
  const [showSwipeHint, setShowSwipeHint] = useState(shouldShowSwipeHint);
  const [sortMode, setSortMode] = useState<"favorite-time" | "channel-grouped">(
    "favorite-time",
  );

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
      // Only show full-page spinner on initial load.
      // Subsequent re-fetches (if any) update items silently to avoid flicker.
      if (!hasFetchedOnce.current) {
        setLoading(true);
      }
      const data = (await podcastApi.getFavorites(200, 0)) as FavoriteItem[];
      setItems(data);
      hasFetchedOnce.current = true;
    } catch (error: unknown) {
      addToast("Failed to load favorites: " + getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (!showSwipeHint) return;
    const seen = localStorage.getItem("podcast_swipe_hint_seen_v1");
    if (seen) {
      setShowSwipeHint(false);
    }
  }, [showSwipeHint]);

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

  const handleDownloadClick = useCallback(
    async (item: FavoriteItem) => {
      const episodeId = item.episode.id;
      if (offlineEpisodes.has(episodeId)) {
        const removed = await removeDownload(episodeId, item.episode.audio_url);
        if (removed) {
          addToast("Download removed", "info");
        } else {
          addToast("Failed to remove download", "error");
        }
        setSwipedEpisodeId(null);
        return;
      }

      const state = downloadState[episodeId];
      if (state?.status === "downloading") {
        cancelDownload(episodeId);
        setSwipedEpisodeId(null);
        return;
      }

      await startDownload(item.episode);
      setSwipedEpisodeId(null);
    },
    [
      offlineEpisodes,
      removeDownload,
      downloadState,
      cancelDownload,
      startDownload,
      addToast,
    ],
  );

  const pollTranscriptStatus = useCallback(
    async (episodeId: number) => {
      const poll = async () => {
        try {
          const batch = (await podcastApi.getEpisodesBatch([episodeId])) as
            | Array<{ episode?: { transcript_status?: string } }>
            | undefined;
          const status = batch?.[0]?.episode?.transcript_status || "none";
          setTranscriptStatus((prev) => ({ ...prev, [episodeId]: status }));

          setItems((prev) =>
            prev.map((entry) =>
              entry.episode.id === episodeId
                ? {
                    ...entry,
                    episode: { ...entry.episode, transcript_status: status },
                  }
                : entry,
            ),
          );

          if (status === "completed") {
            addToast("Transcription complete", "success");
          } else if (status === "failed") {
            addToast("Transcription failed. Please retry.", "error");
          } else if (status === "pending" || status === "processing") {
            setTimeout(poll, 5000);
          }
        } catch {
          // Ignore polling errors; user can retry from action button.
        }
      };
      poll();
    },
    [addToast],
  );

  const handleIntensiveListening = useCallback(
    async (episode: FavoriteItem["episode"], forceRestart = false) => {
      const status =
        episode.transcript_status || transcriptStatus[episode.id] || "none";

      if (status === "completed") {
        navigate(`/player/podcast/${episode.id}`);
        setSwipedEpisodeId(null);
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
        pollTranscriptStatus(episode.id);
      } catch (error: unknown) {
        setTranscriptStatus((prev) => ({ ...prev, [episode.id]: "failed" }));
        addToast(
          "Failed to start transcription: " + getErrorMessage(error),
          "error",
        );
      }
    },
    [
      navigate,
      addToast,
      transcriptStatus,
      settings?.transcriptionRemoteEnabled,
      settings?.transcriptionRemoteUrl,
      settings?.transcriptionRemoteApiKey,
      pollTranscriptStatus,
    ],
  );

  const renderIntensiveListeningButton = (
    episode: FavoriteItem["episode"],
  ): ReactNode => {
    const status =
      episode.transcript_status || transcriptStatus[episode.id] || "none";

    if (status === "pending" || status === "processing") {
      return (
        <button
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            void handleIntensiveListening(episode, true);
          }}
          className="flex-shrink-0 p-3 text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors border border-transparent hover:border-amber-500/30"
          title="Generating transcript... click to restart"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
        </button>
      );
    }

    if (status === "completed") {
      return (
        <button
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            void handleIntensiveListening(episode);
          }}
          className="flex-shrink-0 p-3 text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors border border-transparent hover:border-accent-primary/30"
          title="Enter intensive listening mode"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      );
    }

    return (
      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          void handleIntensiveListening(episode);
        }}
        className="flex-shrink-0 p-3 text-white/35 hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors border border-transparent hover:border-accent-primary/20"
        title="Generate transcript"
      >
        <BookOpen className="w-5 h-5" />
      </button>
    );
  };

  const renderDownloadButton = (item: FavoriteItem): ReactNode => {
    const episode = item.episode;
    const state = downloadState[episode.id] || { status: "idle", progress: 0 };
    const isOffline = offlineEpisodes.has(episode.id);

    if (state.status === "downloading") {
      return (
        <button
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            cancelDownload(episode.id);
          }}
          className="flex-shrink-0 p-3 text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors border border-transparent hover:border-accent-primary/30"
          title="Cancel download"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
        </button>
      );
    }

    if (state.status === "error") {
      return (
        <button
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            void handleDownloadClick(item);
          }}
          className="flex-shrink-0 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/30"
          title={state.error || "Download failed. Click to retry."}
        >
          <AlertCircle className="w-5 h-5" />
        </button>
      );
    }

    if (isOffline || state.status === "done") {
      return (
        <button
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            void handleDownloadClick(item);
          }}
          className="flex-shrink-0 p-3 text-accent-success hover:bg-accent-success/10 rounded-xl transition-colors border border-transparent hover:border-accent-success/30"
          title="Downloaded. Click to remove."
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
      );
    }

    return (
      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          void handleDownloadClick(item);
        }}
        className="flex-shrink-0 p-3 text-white/35 hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors border border-transparent hover:border-accent-primary/20"
        title="Download for offline"
      >
        <Download className="w-5 h-5" />
      </button>
    );
  };

  const handleExpandedChange = useCallback(
    (id: number | string | null) => {
      setSwipedEpisodeId(id);
      if (id !== null && showSwipeHint) {
        setShowSwipeHint(false);
      }
    },
    [showSwipeHint],
  );

  const renderFavoriteEpisodeCard = (
    item: FavoriteItem,
    showFeedTitle: boolean,
  ) => {
    const episode = item.episode;
    const isCurrent = currentEpisode?.id === episode.id;
    const isCurrentAndPlaying = isCurrent && isPlaying;
    const dState = downloadState[episode.id];
    const isDownloading = dState?.status === "downloading";
    const isError = dState?.status === "error";
    const episodeTranscriptStatus =
      episode.transcript_status || transcriptStatus[episode.id] || "none";

    const mobileActions: SwipeAction[] = [
      {
        icon: <Heart className="w-4 h-4" fill="currentColor" />,
        onClick: () => void handleRemove(episode.id),
        disabled: removing[episode.id],
        className: "text-red-400 bg-red-500/10 border-red-500/25 border",
        title: "Remove favorite",
      },
      {
        icon: <ListPlus className="w-4 h-4" />,
        onClick: () => {
          setPlaylistDialogEpisode(episode);
          setSwipedEpisodeId(null);
        },
        className: "text-white/70 bg-white/5 border-white/10 border",
        title: "Add to playlist",
      },
      {
        icon:
          episodeTranscriptStatus === "pending" ||
          episodeTranscriptStatus === "processing" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BookOpen className="w-4 h-4" />
          ),
        onClick: () => void handleIntensiveListening(episode),
        disabled: isDownloading || episodeTranscriptStatus === "processing",
        className: `${
          isDownloading
            ? "text-white/20 bg-white/5 border-white/5"
            : episodeTranscriptStatus === "completed"
              ? "text-accent-primary bg-accent-primary/10 border-accent-primary/25"
              : episodeTranscriptStatus === "pending" ||
                  episodeTranscriptStatus === "processing"
                ? "text-amber-300 bg-amber-500/10 border-amber-500/25"
                : "text-white/35 bg-white/5 border-white/10"
        } border`,
        title:
          episodeTranscriptStatus === "completed"
            ? "Enter intensive listening"
            : "Generate transcript",
      },
      {
        icon: isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : offlineEpisodes.has(episode.id) ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <Download className="w-4 h-4" />
        ),
        onClick: () => void handleDownloadClick(item),
        disabled: false,
        className: `${
          isError
            ? "text-red-400 bg-red-500/10 border-red-500/25"
            : isDownloading || offlineEpisodes.has(episode.id)
              ? "text-accent-primary bg-accent-primary/10 border-accent-primary/25"
              : "text-white/35 bg-white/5 border-white/10"
        } border`,
        title: offlineEpisodes.has(episode.id)
          ? "Downloaded. Click to remove."
          : isDownloading
            ? "Downloading..."
            : isError
              ? "Download failed. Click to retry."
              : "Download for offline",
      },
    ];

    return (
      <EpisodeSwipeCard
        key={episode.id}
        episodeId={episode.id}
        actions={mobileActions}
        expandedId={swipedEpisodeId}
        onExpandedChange={handleExpandedChange}
        showSwipeHint={showSwipeHint}
        className="bg-[#0a0f0d]/40 backdrop-blur-sm border border-white/10"
      >
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-4 p-3 sm:p-4">
          <PodcastCoverPlayButton
            imageUrl={episode.image_url || item.feed.image_url}
            isCurrent={isCurrent}
            isPlaying={isCurrentAndPlaying}
            onClick={() => playEpisode(episode, item.feed, null)}
            sizeClassName="w-12 h-12 sm:w-14 sm:h-14"
            iconClassName="w-4 h-4"
            fallbackIconClassName="w-5 h-5"
          />

          <div className="flex-1 min-w-0 py-1">
            <p className="text-white text-sm font-medium line-clamp-2 leading-snug">
              {episode.title}
            </p>
            {showFeedTitle && (
              <p className="text-white/50 text-xs truncate mt-0.5">
                {item.feed.title}
              </p>
            )}
            <p className="text-white/40 text-[11px] mt-1">
              {buildMetaText(item)}
            </p>
          </div>

          {isCurrent && (
            <span className="hidden md:inline-flex px-2 py-1 rounded-md text-[10px] font-mono text-accent-primary border border-accent-primary/30 bg-accent-primary/10">
              <Check className="w-3 h-3 inline mr-1" />
              NOW
            </span>
          )}

          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                void handleRemove(episode.id);
              }}
              disabled={removing[episode.id]}
              className="flex-shrink-0 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30 disabled:opacity-50"
              title="Remove favorite"
            >
              {removing[episode.id] ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Heart className="w-5 h-5" fill="currentColor" />
              )}
            </button>

            <button
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                setPlaylistDialogEpisode(episode);
              }}
              className="flex-shrink-0 p-3 text-white/30 hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors border border-transparent hover:border-accent-primary/20"
              title="Add to playlist"
            >
              <ListPlus className="w-5 h-5" />
            </button>

            {renderIntensiveListeningButton(episode)}
            {renderDownloadButton(item)}
          </div>
        </div>
      </EpisodeSwipeCard>
    );
  };

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
            favoritesByTime.map((item) =>
              renderFavoriteEpisodeCard(item, true),
            )}

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
                  {group.items.map((item) =>
                    renderFavoriteEpisodeCard(item, false),
                  )}
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
