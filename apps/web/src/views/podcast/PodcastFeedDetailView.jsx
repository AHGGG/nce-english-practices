/**
 * Podcast Feed Detail View - Shows episodes with play buttons.
 * Enhanced with offline download support and progress tracking.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  Loader2,
  Clock,
  Headphones,
  Rss,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  CloudOff,
  HardDrive,
  Info,
  Check,
  Plus,
} from "lucide-react";
import * as podcastApi from "../../api/podcast";
import { usePodcast } from "../../context/PodcastContext";
import { useToast, Dialog, DialogButton } from "../../components/ui";

function formatDuration(seconds) {
  if (!seconds) return "";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

export default function PodcastFeedDetailView() {
  const { feedId } = useParams();
  const navigate = useNavigate();
  const {
    currentEpisode,
    isPlaying,
    currentTime,
    duration,
    playEpisode,
    togglePlayPause,
    // Context now handles downloads
    downloadState,
    offlineEpisodes,
    storageInfo,
    startDownload,
    cancelDownload,
    removeDownload,
  } = usePodcast();
  const { addToast } = useToast();

  const [feed, setFeed] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const PAGE_SIZE = 50;
  const [offset, setOffset] = useState(0);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Auto-refresh state
  const hasAutoRefreshedRef = useRef(false);

  // Local progress state to track updates for episodes that are no longer current
  // { [episodeId]: { current_position: number, is_finished: boolean } }
  const [localProgress, setLocalProgress] = useState({});

  // Refs to capture latest values for effect cleanup
  const lastTimeRef = useRef(0);
  const lastDurationRef = useRef(0);
  const checkedSizeIdsRef = useRef(new Set()); // Track episodes checked for file size

  // Update refs on every render
  lastTimeRef.current = currentTime;
  lastDurationRef.current = duration;

  // Capture progress when switching episodes
  useEffect(() => {
    const prevEp = currentEpisode;

    return () => {
      if (prevEp) {
        // When switching away from an episode, save its final state locally
        // This ensures the UI doesn't revert to the stale DB state until a refresh
        const finalTime = lastTimeRef.current;
        const finalDuration = lastDurationRef.current;
        // If we are very close to the end (within 2s) or it was already finished, mark it
        // Note: We don't have access to 'is_finished' from context directly here without more refs,
        // but time check is usually sufficient for UI feedback.
        const isFinished = finalDuration > 0 && finalTime >= finalDuration - 2;

        setLocalProgress((prev) => ({
          ...prev,
          [prevEp.id]: {
            current_position: finalTime,
            is_finished: isFinished,
          },
        }));
      }
    };
  }, [currentEpisode]);

  // Confirmation Dialog State
  const [confirmAction, setConfirmAction] = useState(null); // { isOpen, title, message, onConfirm, confirmText, isDanger }

  useEffect(() => {
    loadFeed(true);
    checkedSizeIdsRef.current.clear();
    hasAutoRefreshedRef.current = false; // Reset for new feed
  }, [feedId]);

  // Auto-refresh logic: trigger refresh once when subscribed feed is loaded
  useEffect(() => {
    if (!loading && isSubscribed && !hasAutoRefreshedRef.current) {
      hasAutoRefreshedRef.current = true;
      handleRefresh();
    }
  }, [loading, isSubscribed, feedId]);

  // Lazy load file sizes for episodes that miss them (common in some feeds)
  useEffect(() => {
    if (!episodes.length) return;

    const missingSizeIds = episodes
      .filter(
        (ep) =>
          (!ep.file_size || ep.file_size === 0) &&
          !checkedSizeIdsRef.current.has(ep.id),
      )
      .map((ep) => ep.id);

    if (missingSizeIds.length > 0) {
      // Mark as checked to prevent infinite loops/duplicate calls
      missingSizeIds.forEach((id) => checkedSizeIdsRef.current.add(id));

      const timer = setTimeout(async () => {
        try {
          const { updated } =
            await podcastApi.checkEpisodeSizes(missingSizeIds);
          if (Object.keys(updated).length > 0) {
            setEpisodes((prev) =>
              prev.map((ep) =>
                updated[ep.id] ? { ...ep, file_size: updated[ep.id] } : ep,
              ),
            );
          }
        } catch (e) {
          console.error("Failed to check file sizes", e);
        }
      }, 1000); // 1s delay to prioritize initial render

      return () => clearTimeout(timer);
    }
  }, [episodes]);

  async function loadFeed(reset = false) {
    try {
      if (reset) {
        window.scrollTo(0, 0);
        setLoading(true);
        setOffset(0);
        setEpisodes([]);
      }

      const result = await podcastApi.getFeedDetail(feedId, PAGE_SIZE, 0);

      setFeed(result.feed);
      setEpisodes(result.episodes);
      setIsSubscribed(result.is_subscribed);
      setTotalEpisodes(result.total_episodes || result.episodes.length); // Fallback
      setOffset(PAGE_SIZE); // Prepare next offset
    } catch (e) {
      setError(e.message);
    } finally {
      if (reset) setLoading(false);
    }
  }

  async function loadMoreEpisodes() {
    if (loadingMore || offset >= totalEpisodes) return;

    try {
      setLoadingMore(true);
      const result = await podcastApi.getFeedDetail(feedId, PAGE_SIZE, offset);

      setEpisodes((prev) => [...prev, ...result.episodes]);
      setOffset((prev) => prev + PAGE_SIZE);
      // Optionally update total in case it changed
      if (result.total_episodes) setTotalEpisodes(result.total_episodes);
    } catch (e) {
      addToast("Failed to load more episodes: " + e.message, "error");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      const result = await podcastApi.refreshFeed(feedId);
      if (result.new_episodes > 0) {
        loadFeed(true); // Reset to top
      }
      addToast(`Found ${result.new_episodes} new episodes`, "success");
    } catch (e) {
      addToast("Refresh failed: " + e.message, "error");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubscribe() {
    try {
      setSubscribing(true);
      await podcastApi.subscribeToPodcast(feed.rss_url);
      addToast("Subscribed successfully", "success");
      // Refresh data to update is_subscribed status
      setIsSubscribed(true);
    } catch (e) {
      addToast("Subscribe failed: " + e.message, "error");
    } finally {
      setSubscribing(false);
    }
  }

  function requestUnsubscribe() {
    setConfirmAction({
      isOpen: true,
      title: "Unsubscribe Podcast",
      message:
        "Are you sure you want to unsubscribe from this podcast? This action cannot be undone.",
      confirmText: "Unsubscribe",
      isDanger: true,
      onConfirm: async () => {
        try {
          await podcastApi.unsubscribeFromPodcast(feedId);
          addToast("Unsubscribed successfully", "success");
          navigate("/podcast");
        } catch (e) {
          addToast("Failed to unsubscribe: " + e.message, "error");
        } finally {
          setConfirmAction(null);
        }
      },
    });
  }

  function handlePlayEpisode(episode) {
    if (currentEpisode?.id === episode.id) {
      togglePlayPause();
    } else {
      // Pass null to let playEpisode use internal robust resume logic (local + server + isFinished)
      playEpisode(episode, feed, null);
    }
  }

  const handleDownloadClick = useCallback(
    async (episode) => {
      const episodeId = episode.id;

      // Check if already downloaded
      if (offlineEpisodes.has(episodeId)) {
        // Offer to remove
        setConfirmAction({
          isOpen: true,
          title: "Remove Download",
          message:
            "Are you sure you want to remove this episode from offline storage?",
          confirmText: "Remove",
          isDanger: true,
          onConfirm: async () => {
            await removeDownload(episodeId, episode.audio_url);
            setConfirmAction(null);
            addToast("Download removed", "info");
          },
        });
        return;
      }

      // Check if currently downloading (handled by render, but safety)
      const state = downloadState[episodeId];
      if (state?.status === "downloading") {
        cancelDownload(episodeId);
        return;
      }

      // Start download
      startDownload(episode);
    },
    [
      offlineEpisodes,
      downloadState,
      removeDownload,
      startDownload,
      cancelDownload,
      addToast,
    ],
  );

  // Render download button with status
  const renderDownloadButton = (episode) => {
    const state = downloadState[episode.id] || { status: "idle", progress: 0 };
    const isOffline = offlineEpisodes.has(episode.id);

    if (state.status === "downloading") {
      return (
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="relative w-10 h-10 group">
            {/* Progress ring */}
            <svg className="w-10 h-10 -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                className="text-white/10"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                className="text-accent-primary"
                strokeDasharray={`${state.progress} 100`}
                strokeLinecap="round"
              />
            </svg>

            {/* Progress Text (shown by default) */}
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-accent-primary group-hover:opacity-0 transition-opacity">
              {state.progress}%
            </span>

            {/* Cancel Button (shown on hover) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelDownload(episode.id);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              title="Cancel download"
            >
              <span className="text-red-400 font-bold text-xs">✕</span>
            </button>
          </div>
        </div>
      );
    }

    if (state.status === "error") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Retry download
            handleDownloadClick(episode);
          }}
          className="flex-shrink-0 p-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
          title={state.error || "Download failed. Click to retry."}
        >
          <AlertCircle className="w-5 h-5" />
        </button>
      );
    }

    if (isOffline || state.status === "done") {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownloadClick(episode); // Will offer to remove
          }}
          className="flex-shrink-0 p-3 text-accent-success hover:bg-accent-success/10 rounded-lg transition-colors border border-transparent hover:border-accent-success/30"
          title="Downloaded. Click to remove."
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
      );
    }

    // Default: not downloaded
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDownloadClick(episode);
        }}
        className="flex-shrink-0 p-3 text-white/40 hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors border border-transparent hover:border-accent-primary/20"
        title="Download for offline"
      >
        <Download className="w-5 h-5" />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error || !feed) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-mono">{error || "Feed not found"}</p>
          <button
            onClick={() => navigate("/podcast")}
            className="text-accent-primary hover:underline font-mono text-sm uppercase tracking-wider"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] pb-32 text-white font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d] pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0f0d]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/podcast");
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-1.5 rounded bg-accent-primary/10 border border-accent-primary/20">
                <Rss className="w-4 h-4 text-accent-primary flex-shrink-0" />
              </div>
              <span className="text-sm font-mono text-white/60 truncate uppercase tracking-wider">
                {feed.title}
              </span>
            </div>

            {/* Storage indicator */}
            {storageInfo && (
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/40 font-mono border border-white/10 px-2 py-1 rounded bg-black/20">
                <HardDrive className="w-3 h-3" />
                <span>
                  {storageInfo.usedMB} MB / {storageInfo.quotaMB} MB
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8 relative z-10">
        {/* Feed info card */}
        <div className="flex flex-col sm:flex-row gap-8 p-8 bg-[#0a0f0d]/60 backdrop-blur-md border border-white/10 rounded-3xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

          {feed.image_url ? (
            <div className="relative group/image flex-shrink-0 mx-auto sm:mx-0">
              <div className="absolute inset-0 bg-accent-primary/20 blur-xl opacity-0 group-hover/image:opacity-50 transition-opacity duration-500 rounded-full" />
              <img
                src={feed.image_url}
                alt={feed.title}
                referrerPolicy="no-referrer"
                className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl object-cover border border-white/10 shadow-2xl relative z-10"
              />
            </div>
          ) : (
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 border border-white/10 relative z-10">
              <Headphones className="w-16 h-16 text-white/10" />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-6 relative z-10">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white tracking-tight leading-tight">
                {feed.title}
              </h1>
              {feed.author && (
                <p className="text-white/50 mt-2 font-mono text-sm uppercase tracking-wider">
                  {feed.author}
                </p>
              )}
            </div>

            <div className="flex items-center gap-6 text-xs">
              <span className="text-accent-primary font-mono bg-accent-primary/10 px-2 py-1 rounded border border-accent-primary/20">
                {totalEpisodes} EPISODES
              </span>
              {offlineEpisodes.size > 0 && (
                <span className="flex items-center gap-1.5 text-accent-success font-mono bg-accent-success/10 px-2 py-1 rounded border border-accent-success/20">
                  <CloudOff className="w-3 h-3" />
                  {offlineEpisodes.size} OFFLINE
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors border border-white/10"
              >
                <RefreshCw
                  className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              {feed.website_url && (
                <a
                  href={feed.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                >
                  <ExternalLink className="w-3 h-3" />
                  Website
                </a>
              )}

              {isSubscribed ? (
                <button
                  onClick={requestUnsubscribe}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-colors border border-red-500/10 hover:border-red-500/30"
                >
                  <Trash2 className="w-3 h-3" />
                  Unsubscribe
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-accent-primary text-black rounded-xl hover:bg-white transition-colors shadow-lg shadow-accent-primary/20"
                >
                  {subscribing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Subscribe
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {feed.description && (
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
            <p className="text-white/70 text-sm leading-relaxed font-serif">
              {feed.description}
            </p>
          </div>
        )}

        {/* Episodes list */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
            <h2 className="text-xl font-bold font-serif text-white flex items-center gap-3">
              <span className="w-1.5 h-6 bg-accent-primary rounded-full" />
              Episodes
            </h2>
            <div
              className="flex items-center gap-1.5 text-[10px] text-white/30 font-mono uppercase tracking-widest cursor-help"
              title="RSS feeds typically only include recent episodes. The full archive may be available on the podcast's website or streaming platforms."
            >
              <Info className="w-3 h-3" />
              <span className="hidden sm:inline">RSS Limit Applied</span>
            </div>
          </div>

          <div className="space-y-3">
            {episodes.map((episode) => {
              const isCurrentEpisode = currentEpisode?.id === episode.id;
              const isOffline = offlineEpisodes.has(episode.id);

              // Calculate completion status
              // Priority: Current Playback -> Local Progress -> DB Data
              const localState = localProgress[episode.id];

              // Use actual audio duration for current episode (RSS metadata may differ)
              const episodeDuration =
                isCurrentEpisode && duration > 0
                  ? duration
                  : episode.duration_seconds || 1;

              let position = episode.current_position;
              let isFinished = episode.is_finished;

              if (isCurrentEpisode) {
                position = currentTime;
                // Visual check for current episode
                isFinished =
                  isFinished ||
                  ep.is_finished ||
                  (duration > 0 && currentTime >= duration - 2);
              } else if (localState) {
                position = localState.current_position;
                isFinished = localState.is_finished || isFinished;
              }

              const progressPercent = Math.min(
                100,
                Math.round((position / episodeDuration) * 100),
              );
              // Final safety check for visual completion (99% rule)
              isFinished =
                isFinished || (position > 0 && progressPercent >= 99);

              return (
                <div
                  key={episode.id}
                  className={`group relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border ${
                    isCurrentEpisode
                      ? "bg-accent-primary/10 border-accent-primary/30 shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.1)]"
                      : isFinished
                        ? "bg-white/[0.01] border-white/5 opacity-60 hover:opacity-100"
                        : "bg-[#0a0f0d]/40 backdrop-blur-sm border-white/5 hover:border-white/10 hover:bg-white/[0.03]"
                  }`}
                >
                  <button
                    onClick={() => handlePlayEpisode(episode)}
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCurrentEpisode
                        ? "bg-accent-primary text-black shadow-lg shadow-accent-primary/30 scale-105"
                        : isFinished
                          ? "bg-transparent border border-accent-success/30 text-accent-success hover:bg-accent-success/10"
                          : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 hover:scale-105"
                    }`}
                  >
                    {isCurrentEpisode && isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : isFinished && !isCurrentEpisode ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 py-1">
                    <h3
                      className={`text-base font-medium line-clamp-1 mb-2 transition-colors ${
                        isCurrentEpisode
                          ? "text-accent-primary"
                          : isFinished
                            ? "text-white/40 line-through decoration-accent-success/40"
                            : "text-white group-hover:text-accent-primary/80"
                      }`}
                      title={episode.title}
                    >
                      {episode.title}
                      {isOffline && (
                        <CloudOff className="inline-block w-3.5 h-3.5 ml-2 text-accent-success" />
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                      {episode.published_at && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-white/20" />
                          {formatDate(episode.published_at)}
                        </span>
                      )}
                      {episode.duration_seconds && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          {formatDuration(episode.duration_seconds)}
                        </span>
                      )}
                      {episode.file_size > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          {formatFileSize(episode.file_size)}
                        </span>
                      )}
                      {/* Chapter Indicator */}
                      {episode.chapters && episode.chapters.length > 0 && (
                        <span className="text-accent-primary">
                          {episode.chapters.length} CH
                        </span>
                      )}
                      {(() => {
                        if (isFinished) {
                          // Badge removed in favor of Solid Green Check Button
                          return null;
                        }
                        if (position > 0) {
                          return (
                            <span className="text-accent-primary ml-auto">
                              {progressPercent}% COMPLETE
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Download button - always visible, but styled cleanly */}
                  <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                    {renderDownloadButton(episode)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {offset < totalEpisodes && (
            <div className="flex justify-center pt-8">
              <button
                onClick={loadMoreEpisodes}
                disabled={loadingMore}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-mono text-xs uppercase tracking-widest transition-colors flex items-center gap-3"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <span>Load More Episodes</span>
                    <span className="text-white/30">
                      ({Math.min(offset, totalEpisodes)} / {totalEpisodes})
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={confirmAction?.isOpen}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title}
        footer={
          <>
            <DialogButton
              variant="ghost"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </DialogButton>
            <DialogButton
              variant={confirmAction?.isDanger ? "danger" : "primary"}
              onClick={confirmAction?.onConfirm}
            >
              {confirmAction?.confirmText || "Confirm"}
            </DialogButton>
          </>
        }
      >
        <p>{confirmAction?.message}</p>
      </Dialog>
    </div>
  );
}
