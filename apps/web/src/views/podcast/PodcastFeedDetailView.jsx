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

  // Local progress state to track updates for episodes that are no longer current
  // { [episodeId]: { current_position: number, is_finished: boolean } }
  const [localProgress, setLocalProgress] = useState({});

  // Refs to capture latest values for effect cleanup
  const lastTimeRef = useRef(0);
  const lastDurationRef = useRef(0);

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
  }, [feedId]);

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
      // Pass resume position from episode data
      const resumePosition = episode.current_position || 0;
      playEpisode(episode, feed, resumePosition);
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
                className="text-bg-elevated"
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
              className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
          className="flex-shrink-0 p-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
          className="flex-shrink-0 p-3 text-accent-success hover:bg-accent-success/10 rounded-lg transition-colors"
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
        className="flex-shrink-0 p-3 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-colors"
        title="Download for offline"
      >
        <Download className="w-5 h-5" />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error || !feed) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error || "Feed not found"}</p>
          <button
            onClick={() => navigate("/podcast")}
            className="text-accent-primary hover:underline"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-base/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/podcast");
                }
              }}
              className="p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Rss className="w-5 h-5 text-accent-primary flex-shrink-0" />
              <span className="text-sm font-mono text-text-muted truncate">
                {feed.title}
              </span>
            </div>

            {/* Storage indicator */}
            {storageInfo && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted">
                <HardDrive className="w-4 h-4" />
                <span>
                  {storageInfo.usedMB} MB / {storageInfo.quotaMB} MB
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Feed info card */}
        <div className="flex flex-col sm:flex-row gap-6 p-6 bg-bg-surface border border-border rounded-2xl">
          {feed.image_url ? (
            <img
              src={feed.image_url}
              alt={feed.title}
              referrerPolicy="no-referrer"
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl object-cover flex-shrink-0 mx-auto sm:mx-0 border border-border"
            />
          ) : (
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl bg-gradient-to-br from-bg-elevated to-bg-base flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0 border border-border">
              <Headphones className="w-12 h-12 text-text-muted" />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <h1 className="text-2xl font-bold font-serif text-text-primary">
                {feed.title}
              </h1>
              {feed.author && (
                <p className="text-text-muted mt-1">{feed.author}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-accent-primary/70 font-mono">
                {totalEpisodes} episodes
              </span>
              {offlineEpisodes.size > 0 && (
                <span className="flex items-center gap-1 text-accent-success font-mono">
                  <CloudOff className="w-4 h-4" />
                  {offlineEpisodes.size} offline
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-bg-elevated text-text-primary rounded-lg hover:bg-bg-base transition-colors border border-border"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>

              {feed.website_url && (
                <a
                  href={feed.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-bg-elevated text-text-primary rounded-lg hover:bg-bg-base transition-colors border border-border"
                >
                  <ExternalLink className="w-4 h-4" />
                  Website
                </a>
              )}

              {isSubscribed ? (
                <button
                  onClick={requestUnsubscribe}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                  Unsubscribe
                </button>
              ) : (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-accent-primary text-black font-medium rounded-lg hover:shadow-lg hover:shadow-accent-primary/20 transition-colors"
                >
                  {subscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Subscribe
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {feed.description && (
          <p className="text-text-muted text-sm leading-relaxed line-clamp-3">
            {feed.description}
          </p>
        )}

        {/* Episodes list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold font-serif text-text-primary">
              Episodes
            </h2>
            <div
              className="flex items-center gap-1.5 text-xs text-text-muted/60 cursor-help"
              title="RSS feeds typically only include recent episodes. The full archive may be available on the podcast's website or streaming platforms."
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                RSS feeds show recent episodes only
              </span>
            </div>
          </div>

          <div className="space-y-2">
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
                  isFinished || (duration > 0 && currentTime >= duration - 2);
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
                  className={`group relative flex items-center gap-3 p-3 sm:p-4 rounded-xl transition-all duration-300 ${
                    isCurrentEpisode
                      ? "bg-accent-primary/10 border border-accent-primary/30 shadow-lg shadow-accent-primary/10"
                      : isFinished
                        ? "opacity-50 bg-bg-surface/50"
                        : "bg-bg-surface border border-transparent hover:border-accent-primary/20 hover:shadow-lg hover:shadow-accent-primary/5"
                  }`}
                >
                  <button
                    onClick={() => handlePlayEpisode(episode)}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCurrentEpisode
                        ? "bg-accent-primary text-black shadow-lg shadow-accent-primary/30 scale-105"
                        : isFinished
                          ? "bg-transparent border-2 border-accent-success/40 text-accent-success hover:border-accent-success hover:bg-accent-success/10"
                          : "bg-bg-elevated/30 border border-white/10 text-text-primary hover:bg-bg-elevated hover:border-white/20 hover:scale-105 hover:shadow-lg"
                    }`}
                  >
                    {isCurrentEpisode && isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : isFinished && !isCurrentEpisode ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 py-1">
                    <h3
                      className={`text-base line-clamp-2 leading-relaxed mb-1.5 transition-colors ${
                        isCurrentEpisode
                          ? "text-accent-primary font-bold"
                          : isFinished
                            ? "text-gray-400 line-through decoration-accent-success/60 decoration-2"
                            : "text-text-primary font-bold group-hover:text-white"
                      }`}
                      title={episode.title}
                    >
                      {episode.title}
                      {isOffline && (
                        <CloudOff className="inline-block w-3.5 h-3.5 ml-2 text-accent-success" />
                      )}
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-medium text-text-muted/60">
                      {episode.published_at && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-border-subtle group-hover:bg-accent-primary/50 transition-colors" />
                          {formatDate(episode.published_at)}
                        </span>
                      )}
                      {episode.duration_seconds && (
                        <span className="flex items-center gap-1.5 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatDuration(episode.duration_seconds)}
                        </span>
                      )}
                      {(() => {
                        if (isFinished) {
                          // Badge removed in favor of Solid Green Check Button
                          return null;
                        }
                        if (position > 0) {
                          return (
                            <span className="text-accent-primary font-mono bg-accent-primary/10 px-2 py-0.5 rounded-md text-[10px] tracking-wide">
                              {progressPercent}% PLAYED
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  {/* Download button - always visible, but styled cleanly */}
                  <div className="opacity-70 hover:opacity-100 transition-opacity">
                    {renderDownloadButton(episode)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {offset < totalEpisodes && (
            <div className="flex justify-center pt-4">
              <button
                onClick={loadMoreEpisodes}
                disabled={loadingMore}
                className="px-6 py-3 bg-bg-surface hover:bg-bg-elevated border border-border rounded-xl text-text-primary font-medium transition-colors flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading more...
                  </>
                ) : (
                  <>
                    <span>Load More Episodes</span>
                    <span className="text-text-muted text-xs">
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
