/**
 * Podcast Downloads View - Shows all downloaded episodes for offline playback.
 * Includes storage management and episode list with playback controls.
 */

import { useState, useEffect, useCallback } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Pause,
  Trash2,
  Loader2,
  CloudOff,
  AlertCircle,
  Music,
  RefreshCw,
  Check,
  Download,
  BookOpen,
  Heart,
} from "lucide-react";
import PodcastLayout from "../../components/podcast/PodcastLayout";
import { usePodcast } from "../../context/PodcastContext";
import { useGlobalState } from "../../context/GlobalContext";
import * as podcastApi from "../../api/podcast";
import { useToast, Dialog, DialogButton } from "../../components/ui";

interface PodcastFeed {
  id: number;
  title: string;
}

interface PodcastEpisode {
  id: number;
  title: string;
  audio_url: string;
  duration_seconds?: number;
  current_position?: number;
  is_finished?: boolean;
  transcript_status?: string;
}

interface EpisodeBatchItem {
  episode: PodcastEpisode;
  feed: PodcastFeed;
  last_position_seconds?: number;
  is_finished?: boolean;
  transcript_status?: string;
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
  currentEpisode: PodcastEpisode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playEpisode: (
    episode: PodcastEpisode,
    feed: PodcastFeed,
    start: number | null,
  ) => void;
  togglePlayPause: () => void;
  offlineEpisodes: Set<number>;
  storageInfo: { usedMB: number; used: number; quota: number } | null;
  removeDownload: (episodeId: number, audioUrl: string) => Promise<boolean>;
  clearAllDownloads: () => Promise<boolean>;
  downloadState: Record<number, DownloadItemState>;
  cancelDownload: (episodeId: number) => void;
  finishedEpisodes: Set<number>;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
}

export default function PodcastDownloadsView() {
  const navigate = useNavigate();
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    playEpisode,
    togglePlayPause,
    // Use context for offline state and downloads
    offlineEpisodes,
    storageInfo,
    removeDownload,
    clearAllDownloads,
    downloadState,
    cancelDownload,
    finishedEpisodes,
  } = usePodcast() as PodcastContextValue;
  const {
    state: { settings },
  } = useGlobalState() as { state: { settings: GlobalSettings } };
  const { addToast } = useToast();

  const [episodes, setEpisodes] = useState<EpisodeBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  // storageInfo is now from context
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // Transcription state: { [episodeId]: 'none' | 'pending' | 'processing' | 'completed' | 'failed' }
  const [transcriptStatus, setTranscriptStatus] = useState<
    Record<number, string>
  >({});
  const [favoriteEpisodeIds, setFavoriteEpisodeIds] = useState<Set<number>>(
    new Set(),
  );
  const [favoriteLoading, setFavoriteLoading] = useState<
    Record<number, boolean>
  >({});

  const loadFavoriteIds = useCallback(async () => {
    try {
      const result = (await podcastApi.getFavoriteEpisodeIds()) as {
        episode_ids?: number[];
      };
      setFavoriteEpisodeIds(new Set(result.episode_ids || []));
    } catch {
      setFavoriteEpisodeIds(new Set());
    }
  }, []);

  // Load offline episodes
  const loadEpisodes = useCallback(async () => {
    // Collect IDs: both completed (offlineEpisodes) and currently downloading (downloadState)
    const offlineIds = Array.from(offlineEpisodes);
    const downloadingIds = Object.entries(downloadState)
      .filter(
        ([_, state]) =>
          state.status === "downloading" || state.status === "error",
      )
      .map(([id]) => Number(id));

    // Merge unique IDs
    const allIds = [...new Set([...offlineIds, ...downloadingIds])];

    if (allIds.length === 0) {
      setEpisodes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Efficiently fetch details for all episodes in one batch request
      const episodesData = (await podcastApi.getEpisodesBatch(
        allIds,
      )) as EpisodeBatchItem[];

      // Sort by recently added (reverse order of allIds)
      // offlineEpisodes preserves insertion order (oldest -> newest)
      // downloadingIds are added at the end
      // We want Newest -> Oldest
      const epMap = new Map<number, EpisodeBatchItem>(
        episodesData.map((e) => [e.episode.id, e]),
      );

      const sortedEpisodes = [...allIds]
        .reverse()
        .map((id) => epMap.get(id))
        .filter((item): item is EpisodeBatchItem => Boolean(item));

      setEpisodes(sortedEpisodes);
    } catch (e: unknown) {
      console.error("Failed to load episodes:", e);
    } finally {
      setLoading(false);
    }
  }, [offlineEpisodes, downloadState]);

  useEffect(() => {
    // Only trigger full reload if the SET of IDs changes, not on every progress update
    // We handle progress updates via the downloadState object directly in render

    // This effect might be too aggressive if triggered on every downloadState change (progress)
    // Ideally we only reload if a NEW episode starts downloading or finishes (and wasn't in list)

    // Simplification: Load once on mount, and then rely on context updates?
    // No, we need the episode METADATA (title, image) which isn't in context.

    // Optimization: Debounce or check if IDs actually changed?
    // For now, let's trust that users don't have 100s of active downloads.
    // We can optimize by only fetching NEW ids.

    loadEpisodes();
  }, [offlineEpisodes.size, Object.keys(downloadState).length]); // Only reload when counts change

  useEffect(() => {
    void loadFavoriteIds();
  }, [loadFavoriteIds]);

  const handlePlay = (item: EpisodeBatchItem) => {
    if (currentEpisode?.id === item.episode.id) {
      togglePlayPause();
    } else {
      // Pass null to let playEpisode use internal robust resume logic (local + server + isFinished)
      playEpisode(item.episode, item.feed, null);
    }
  };

  const handleDelete = async (item: EpisodeBatchItem) => {
    const episodeId = item.episode.id;

    // If it's downloading, cancel it
    if (downloadState[episodeId]?.status === "downloading") {
      cancelDownload(episodeId);
      setEpisodes((prev) => prev.filter((ep) => ep.episode.id !== episodeId));
      return;
    }

    setDeleting((prev) => ({ ...prev, [episodeId]: true }));

    try {
      const success = await removeDownload(episodeId, item.episode.audio_url);
      if (success) {
        // List update is handled by useEffect on offlineEpisodes change
        // but we can optimistically filter locally to avoid flicker
        setEpisodes((prev) => prev.filter((ep) => ep.episode.id !== episodeId));
        addToast("Episode removed", "success");
      } else {
        addToast("Failed to remove episode", "error");
      }
    } catch (e: unknown) {
      addToast("Failed to remove: " + getErrorMessage(e), "error");
    } finally {
      setDeleting((prev) => ({ ...prev, [episodeId]: false }));
    }
  };

  const handleToggleFavorite = async (episodeId: number) => {
    const isFavorite = favoriteEpisodeIds.has(episodeId);
    try {
      setFavoriteLoading((prev) => ({ ...prev, [episodeId]: true }));
      if (isFavorite) {
        await podcastApi.removeFavoriteEpisode(episodeId);
        setFavoriteEpisodeIds((prev) => {
          const next = new Set(prev);
          next.delete(episodeId);
          return next;
        });
        addToast("Removed from favorites", "info");
      } else {
        await podcastApi.addFavoriteEpisode(episodeId);
        setFavoriteEpisodeIds((prev) => {
          const next = new Set(prev);
          next.add(episodeId);
          return next;
        });
        addToast("Added to favorites", "success");
      }
    } catch (e: unknown) {
      addToast("Favorite update failed: " + getErrorMessage(e), "error");
    } finally {
      setFavoriteLoading((prev) => ({ ...prev, [episodeId]: false }));
    }
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const performClearAll = async () => {
    setClearing(true);
    setShowClearConfirm(false);
    try {
      const success = await clearAllDownloads();
      if (success) {
        setEpisodes([]);
        addToast("All downloads cleared", "success");
      } else {
        addToast("Failed to clear cache", "error");
      }
    } catch (e: unknown) {
      addToast("Failed to clear cache: " + getErrorMessage(e), "error");
    } finally {
      setClearing(false);
    }
  };

  // Handle intensive listening mode button click
  const handleIntensiveListening = useCallback(
    async (episode: PodcastEpisode, forceRestart = false) => {
      const status =
        episode.transcript_status || transcriptStatus[episode.id] || "none";

      if (status === "completed") {
        // Navigate to unified player
        navigate(`/player/podcast/${episode.id}`);
        return;
      }

      if ((status === "pending" || status === "processing") && !forceRestart) {
        addToast("Transcription in progress. Please wait...", "info");
        return;
      }

      // Start transcription
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

        // Start polling for status
        pollTranscriptStatus(episode.id);
      } catch (e: unknown) {
        setTranscriptStatus((prev) => ({ ...prev, [episode.id]: "failed" }));
        addToast(
          "Failed to start transcription: " + getErrorMessage(e),
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
    ],
  );

  // Poll transcript status
  const pollTranscriptStatus = useCallback(
    async (episodeId: number) => {
      const poll = async () => {
        try {
          const items = (await podcastApi.getEpisodesBatch([
            episodeId,
          ])) as EpisodeBatchItem[];
          const item = items?.[0];
          if (!item) return;

          const status =
            item.episode?.transcript_status || item.transcript_status || "none";
          setTranscriptStatus((prev) => ({ ...prev, [episodeId]: status }));

          // Update episode in list
          setEpisodes((prev) =>
            prev.map((e) =>
              e.episode.id === episodeId
                ? { ...e, episode: { ...e.episode, transcript_status: status } }
                : e,
            ),
          );

          if (status === "completed") {
            addToast(
              "Transcription complete! You can now enter intensive listening mode.",
              "success",
            );
          } else if (status === "failed") {
            addToast("Transcription failed. Please try again.", "error");
          } else if (status === "pending" || status === "processing") {
            // Continue polling
            setTimeout(poll, 5000);
          }
        } catch (e: unknown) {
          console.error("Failed to poll transcript status:", e);
        }
      };

      poll();
    },
    [addToast],
  );

  // Render intensive listening button
  const renderIntensiveListeningButton = (
    episode: PodcastEpisode,
  ): ReactNode => {
    const status =
      episode.transcript_status || transcriptStatus[episode.id] || "none";

    if (status === "pending" || status === "processing") {
      return (
        <button
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            handleIntensiveListening(episode, true);
          }}
          className="flex-shrink-0 p-3 text-amber-400 hover:bg-amber-500/10 rounded-xl transition-colors border border-transparent hover:border-amber-500/30"
          title="Generating transcript... Click to restart if stuck"
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
            handleIntensiveListening(episode);
          }}
          className="flex-shrink-0 p-3 text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors border border-transparent hover:border-accent-primary/30"
          title="Enter intensive listening mode"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      );
    }

    // Default: not transcribed
    return (
      <button
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          handleIntensiveListening(episode);
        }}
        className="flex-shrink-0 p-3 text-white/40 hover:text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors border border-transparent hover:border-accent-primary/20"
        title="Generate transcript for intensive listening"
      >
        <BookOpen className="w-5 h-5" />
      </button>
    );
  };

  return (
    <PodcastLayout title="Downloads">
      <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
        {/* Storage card */}
        <div className="p-4 md:p-8 bg-[#0a0f0d]/60 backdrop-blur-md border border-white/10 rounded-2xl md:rounded-3xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-success/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative z-10">
            <div className="flex items-center gap-3 md:gap-5">
              <div className="p-3 md:p-4 bg-accent-success/10 border border-accent-success/20 rounded-xl md:rounded-2xl shadow-[0_0_20px_rgba(var(--color-accent-success-rgb),0.15)] flex-shrink-0">
                <CloudOff className="w-6 h-6 md:w-8 md:h-8 text-accent-success" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold font-serif text-white tracking-tight">
                  Offline Library
                </h2>
                <div className="flex items-center gap-2 md:gap-3 mt-1">
                  <span className="text-[10px] md:text-xs font-bold text-accent-success uppercase tracking-widest bg-accent-success/10 border border-accent-success/20 px-1.5 md:px-2 py-0.5 rounded-md">
                    {episodes.length} Episodes
                  </span>
                  {storageInfo && (
                    <span className="text-[10px] md:text-xs font-mono text-white/40">
                      {storageInfo.usedMB} used
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
              {/* Storage bar */}
              {storageInfo && (
                <div className="hidden md:block flex-1 min-w-[140px]">
                  <div className="flex justify-between items-center text-[10px] text-white/40 font-mono mb-2 uppercase tracking-widest">
                    <span>Storage</span>
                    <span>
                      {Math.round((storageInfo.used / storageInfo.quota) * 100)}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-accent-success to-accent-primary shadow-[0_0_10px_rgba(var(--color-accent-success-rgb),0.5)]"
                      style={{
                        width: `${Math.min((storageInfo.used / storageInfo.quota) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                <button
                  onClick={loadEpisodes}
                  className="flex-1 sm:flex-none p-2.5 md:p-3 bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 flex justify-center"
                  title="Refresh list"
                >
                  <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
                </button>

                {episodes.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    disabled={clearing}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2.5 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 rounded-xl transition-all active:scale-95 whitespace-nowrap"
                    title="Clear all downloads"
                  >
                    {clearing ? (
                      <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    )}
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Episode list */}
        {loading && episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-accent-primary" />
            <span className="text-xs font-mono uppercase tracking-widest text-white/40">
              Loading Downloads...
            </span>
          </div>
        ) : episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-full">
              <Music className="w-12 h-12 text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-lg font-serif text-white/80">
                No downloads yet
              </p>
              <p className="text-sm text-white/40 mt-2 font-light max-w-xs mx-auto">
                Download episodes from your subscribed podcasts to listen
                offline.
              </p>
            </div>
            <button
              onClick={() => navigate("/podcast")}
              className="px-8 py-3 bg-accent-primary text-black font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-white transition-all shadow-lg shadow-accent-primary/20"
            >
              Browse Library
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {episodes.map((item) => {
              const isCurrentEpisode = currentEpisode?.id === item.episode.id;
              const ep = item.episode;
              const dState = downloadState[ep.id];
              const isDownloading = dState?.status === "downloading";
              const isError = dState?.status === "error";

              // Calculate completion status
              const isCurrentEp = currentEpisode?.id === ep.id;
              const episodeDuration =
                isCurrentEp && duration > 0
                  ? duration
                  : ep.duration_seconds || 1;
              const position = isCurrentEp
                ? currentTime
                : item.last_position_seconds || ep.current_position || 0;
              const progressPercent = Math.min(
                100,
                Math.round((position / episodeDuration) * 100),
              );
              const isFinished =
                finishedEpisodes.has(ep.id) ||
                item.is_finished ||
                ep.is_finished ||
                (position > 0 && progressPercent >= 99);
              const isCurrentAndPlaying = isCurrentEpisode && isPlaying;

              return (
                <div
                  key={ep.id}
                  className={`group relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-300 border ${
                    isFinished
                      ? "bg-white/[0.01] border-white/5 opacity-60 hover:opacity-100"
                      : isCurrentEpisode
                        ? "bg-accent-primary/10 border-accent-primary/30 shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.1)]"
                        : "bg-[#0a0f0d]/40 backdrop-blur-sm border-white/5 hover:border-white/10 hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Play button or Download Spinner */}
                  <div className="flex-shrink-0 pt-0">
                    {isDownloading ? (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
                        <div className="relative w-6 h-6 sm:w-8 sm:h-8">
                          <svg className="w-6 h-6 sm:w-8 sm:h-8 -rotate-90">
                            <circle
                              cx="50%"
                              cy="50%"
                              r="45%"
                              strokeWidth="3"
                              stroke="currentColor"
                              fill="none"
                              className="text-white/10"
                            />
                            <circle
                              cx="50%"
                              cy="50%"
                              r="45%"
                              strokeWidth="3"
                              stroke="currentColor"
                              fill="none"
                              className="text-accent-primary"
                              strokeDasharray={`${dState.progress} 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono text-accent-primary font-bold">
                            {dState.progress}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePlay(item)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          isFinished
                            ? "bg-transparent border border-accent-success/30 text-accent-success hover:bg-accent-success/10"
                            : isCurrentEpisode
                              ? "bg-accent-primary text-black shadow-lg shadow-accent-primary/30 scale-105"
                              : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 hover:scale-105 shadow-lg shadow-black/20"
                        }`}
                      >
                        {isCurrentAndPlaying ? (
                          <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                        ) : isFinished ? (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                        ) : (
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 fill-current" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Episode info */}
                  <div className="flex-1 min-w-0 py-1">
                    <h3
                      className={`text-sm sm:text-base font-medium line-clamp-2 mb-1.5 transition-colors leading-snug ${
                        isFinished
                          ? "text-white/40 line-through decoration-accent-success/40"
                          : isCurrentEpisode
                            ? "text-accent-primary"
                            : "text-white group-hover:text-accent-primary/80"
                      }`}
                    >
                      {ep.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      <span className="truncate max-w-[150px] text-white/60 font-bold">
                        {item.feed.title}
                      </span>

                      {ep.duration_seconds && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          {formatDuration(ep.duration_seconds)}
                        </span>
                      )}

                      {/* Status Badges */}
                      {isDownloading ? (
                        <span className="flex items-center gap-1 text-accent-primary animate-pulse bg-accent-primary/5 px-2 py-0.5 rounded-md border border-accent-primary/10">
                          <Download className="w-3 h-3" />
                          Downloading
                        </span>
                      ) : isError ? (
                        <span className="flex items-center gap-1 text-red-400 bg-red-500/5 px-2 py-0.5 rounded-md border border-red-500/10">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-accent-success bg-accent-success/5 px-2 py-0.5 rounded-md border border-accent-success/10">
                          <CloudOff className="w-3 h-3" />
                          Offline
                        </span>
                      )}

                      {!isFinished && progressPercent > 0 && (
                        <span className="text-accent-primary ml-auto font-bold animate-in fade-in duration-500">
                          {progressPercent}% COMPLETE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0 sm:self-center self-start">
                    <button
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        void handleToggleFavorite(ep.id);
                      }}
                      disabled={favoriteLoading[ep.id]}
                      className={`flex-shrink-0 p-3 rounded-xl transition-colors border border-transparent ${
                        favoriteEpisodeIds.has(ep.id)
                          ? "text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                          : "text-white/30 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                      }`}
                      title={
                        favoriteEpisodeIds.has(ep.id)
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                    >
                      <Heart
                        className="w-5 h-5"
                        fill={
                          favoriteEpisodeIds.has(ep.id)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>

                    {/* Intensive Listening button - only show for completed downloads */}
                    {!isDownloading &&
                      !isError &&
                      renderIntensiveListeningButton(ep)}

                    {/* Delete/Cancel button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                      disabled={deleting[ep.id]}
                      className="flex-shrink-0 p-3 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors relative z-10"
                      title={
                        isDownloading ? "Cancel download" : "Remove download"
                      }
                    >
                      {deleting[ep.id] ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Progress bar (thin line at the bottom of the card) */}
                  {!isFinished && progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 rounded-b-2xl overflow-hidden">
                      <div
                        className="h-full bg-accent-primary shadow-[0_0_8px_rgba(var(--color-accent-primary-rgb),0.5)] transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Dialog
          isOpen={showClearConfirm}
          onClose={() => setShowClearConfirm(false)}
          title="Clear All Downloads"
          footer={
            <>
              <DialogButton
                variant="ghost"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </DialogButton>
              <DialogButton variant="danger" onClick={performClearAll}>
                Clear All
              </DialogButton>
            </>
          }
        >
          <p>
            Are you sure you want to remove all downloaded episodes? This cannot
            be undone.
          </p>
        </Dialog>
      </div>
    </PodcastLayout>
  );
}
