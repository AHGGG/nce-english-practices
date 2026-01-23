/**
 * Podcast Feed Detail View - Shows episodes with play buttons.
 * Enhanced with offline download support and progress tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Play, Pause, RefreshCw, Trash2, Loader2,
    Clock, Headphones, Rss, ExternalLink, Download,
    CheckCircle2, AlertCircle, CloudOff, HardDrive, Info
} from 'lucide-react';
import * as podcastApi from '../../api/podcast';
import { authFetch } from '../../api/auth';
import { usePodcast } from '../../context/PodcastContext';
import {
    downloadEpisodeForOffline,
    getOfflineEpisodeIds,
    removeOfflineEpisode,
    getStorageEstimate
} from '../../utils/offline';
import { useToast, Dialog, DialogButton } from '../../components/ui';

function formatDuration(seconds) {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function PodcastFeedDetailView() {
    const { feedId } = useParams();
    const navigate = useNavigate();
    const { currentEpisode, isPlaying, currentTime, duration, playEpisode, togglePlayPause } = usePodcast();
    const { addToast } = useToast();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Confirmation Dialog State
    const [confirmAction, setConfirmAction] = useState(null); // { isOpen, title, message, onConfirm, confirmText, isDanger }

    // Download state: { [episodeId]: { status: 'idle'|'downloading'|'done'|'error', progress: 0-100, error?: string } }
    const [downloadState, setDownloadState] = useState({});
    const [offlineEpisodes, setOfflineEpisodes] = useState(new Set());
    const [storageInfo, setStorageInfo] = useState(null);

    // Load offline episodes on mount
    useEffect(() => {
        const ids = getOfflineEpisodeIds();
        setOfflineEpisodes(new Set(ids));

        // Get storage estimate
        getStorageEstimate().then(setStorageInfo);
    }, []);

    useEffect(() => {
        loadFeed();
    }, [feedId]);

    async function loadFeed() {
        try {
            setLoading(true);
            const result = await podcastApi.getFeedDetail(feedId);
            setData(result);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleRefresh() {
        try {
            setRefreshing(true);
            const result = await podcastApi.refreshFeed(feedId);
            if (result.new_episodes > 0) {
                loadFeed();
            }
            addToast(`Found ${result.new_episodes} new episodes`, 'success');
        } catch (e) {
            addToast('Refresh failed: ' + e.message, 'error');
        } finally {
            setRefreshing(false);
        }
    }

    function requestUnsubscribe() {
        setConfirmAction({
            isOpen: true,
            title: "Unsubscribe Podcast",
            message: "Are you sure you want to unsubscribe from this podcast? This action cannot be undone.",
            confirmText: "Unsubscribe",
            isDanger: true,
            onConfirm: async () => {
                try {
                    await podcastApi.unsubscribeFromPodcast(feedId);
                    addToast('Unsubscribed successfully', 'success');
                    navigate('/podcast');
                } catch (e) {
                    addToast('Failed to unsubscribe: ' + e.message, 'error');
                } finally {
                    setConfirmAction(null);
                }
            }
        });
    }

    function handlePlayEpisode(episode) {
        if (currentEpisode?.id === episode.id) {
            togglePlayPause();
        } else {
            // Pass resume position from episode data
            const resumePosition = episode.current_position || 0;
            playEpisode(episode, data.feed, resumePosition);
        }
    }

    // Track abort controllers: { [episodeId]: AbortController }
    const [abortControllers, setAbortControllers] = useState({});

    // Cleanup abort controllers on unmount
    useEffect(() => {
        return () => {
            Object.values(abortControllers).forEach(controller => controller.abort());
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleCancelDownload = useCallback((episodeId) => {
        const controller = abortControllers[episodeId];
        if (controller) {
            controller.abort();
            setAbortControllers(prev => {
                const next = { ...prev };
                delete next[episodeId];
                return next;
            });
            setDownloadState(prev => ({ ...prev, [episodeId]: { status: 'idle', progress: 0 } }));
        }
    }, [abortControllers]);

    const handleDownload = useCallback(async (episode) => {
        const episodeId = episode.id;
        const proxyUrl = `/api/podcast/episode/${episodeId}/download`;

        // Check if already downloaded
        if (offlineEpisodes.has(episodeId)) {
            // Offer to remove
            setConfirmAction({
                isOpen: true,
                title: "Remove Download",
                message: "Are you sure you want to remove this episode from offline storage?",
                confirmText: "Remove",
                isDanger: true,
                onConfirm: async () => {
                    await removeOfflineEpisode(episodeId, proxyUrl);
                    setOfflineEpisodes(prev => {
                        const next = new Set(prev);
                        next.delete(episodeId);
                        return next;
                    });
                    setDownloadState(prev => ({ ...prev, [episodeId]: { status: 'idle', progress: 0 } }));
                    setConfirmAction(null);
                    addToast('Download removed', 'info');
                }
            });
            return;
        }

        // Start download
        const controller = new AbortController();
        setAbortControllers(prev => ({ ...prev, [episodeId]: controller }));
        setDownloadState(prev => ({ ...prev, [episodeId]: { status: 'downloading', progress: 0 } }));

        try {
            const success = await downloadEpisodeForOffline(
                episodeId,
                proxyUrl,
                (received, total) => {
                    const progress = Math.round((received / total) * 100);
                    setDownloadState(prev => ({ ...prev, [episodeId]: { status: 'downloading', progress } }));
                },
                authFetch,
                controller.signal
            );

            if (success) {
                setDownloadState(prev => ({ ...prev, [episodeId]: { status: 'done', progress: 100 } }));
                setOfflineEpisodes(prev => new Set([...prev, episodeId]));
                // Update storage info
                getStorageEstimate().then(setStorageInfo);
            }
        } catch (e) {
            // If aborted, the UI is already reset by handleCancelDownload usually
            // but we check here just in case natural abort happened
            let errorMsg = e.message || 'Unknown error';

            if (controller.signal.aborted) {
                // Aborted by user
                setDownloadState(prev => ({ ...prev, [episodeId]: { status: 'idle', progress: 0 } }));
                return;
            }

            // Handle quota exceeded error
            if (e.name === 'QuotaExceededError' || errorMsg.includes('quota')) {
                errorMsg = 'Storage full. Please free up space.';
            }

            setDownloadState(prev => ({
                ...prev,
                [episodeId]: { status: 'error', progress: 0, error: errorMsg }
            }));

            console.error('[Download] Failed:', e);
        } finally {
            // Cleanup controller ref
            setAbortControllers(prev => {
                const next = { ...prev };
                delete next[episodeId];
                return next;
            });
        }
    }, [offlineEpisodes]);

    // Render download button with status
    const renderDownloadButton = (episode) => {
        const state = downloadState[episode.id] || { status: 'idle', progress: 0 };
        const isOffline = offlineEpisodes.has(episode.id);

        if (state.status === 'downloading') {
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
                                handleCancelDownload(episode.id);
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

        if (state.status === 'error') {
            return (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Retry download
                        setDownloadState(prev => ({ ...prev, [episode.id]: { status: 'idle', progress: 0 } }));
                        handleDownload(episode);
                    }}
                    className="flex-shrink-0 p-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title={state.error || 'Download failed. Click to retry.'}
                >
                    <AlertCircle className="w-5 h-5" />
                </button>
            );
        }

        if (isOffline || state.status === 'done') {
            return (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(episode); // Will offer to remove
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
                    handleDownload(episode);
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

    if (error || !data) {
        return (
            <div className="min-h-screen bg-bg-base flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-red-400">{error || 'Feed not found'}</p>
                    <button
                        onClick={() => navigate('/podcast')}
                        className="text-accent-primary hover:underline"
                    >
                        Back to Library
                    </button>
                </div>
            </div>
        );
    }

    const { feed, episodes } = data;

    return (
        <div className="min-h-screen bg-bg-base pb-32">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-bg-base/95 backdrop-blur border-b border-border">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/podcast')}
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
                                <span>{storageInfo.usedMB} MB / {storageInfo.quotaMB} MB</span>
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
                                {episodes.length} episodes
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
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
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

                            <button
                                onClick={requestUnsubscribe}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                            >
                                <Trash2 className="w-4 h-4" />
                                Unsubscribe
                            </button>
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
                        <h2 className="text-lg font-bold font-serif text-text-primary">Episodes</h2>
                        <div
                            className="flex items-center gap-1.5 text-xs text-text-muted/60 cursor-help"
                            title="RSS feeds typically only include recent episodes. The full archive may be available on the podcast's website or streaming platforms."
                        >
                            <Info className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">RSS feeds show recent episodes only</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {episodes.map((episode) => {
                            const isCurrentEpisode = currentEpisode?.id === episode.id;
                            const isOffline = offlineEpisodes.has(episode.id);

                            return (
                                <div
                                    key={episode.id}
                                    className={`group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border border-transparent ${isCurrentEpisode
                                        ? 'bg-accent-primary/5 border-accent-primary/20 shadow-[0_0_20px_rgba(var(--color-accent-primary),0.05)]'
                                        : 'hover:bg-bg-elevated/40 hover:border-white/5'
                                        }`}
                                >
                                    {/* Active Indicator Stripe */}
                                    {isCurrentEpisode && (
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-accent-primary rounded-r-full" />
                                    )}

                                    <button
                                        onClick={() => handlePlayEpisode(episode)}
                                        className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${isCurrentEpisode
                                            ? 'bg-accent-primary text-black shadow-lg shadow-accent-primary/30 scale-105'
                                            : 'bg-bg-elevated/50 text-text-muted group-hover:bg-accent-primary/10 group-hover:text-accent-primary group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-accent-primary/10'
                                            }`}
                                    >
                                        {isCurrentEpisode && isPlaying ? (
                                            <Pause className="w-5 h-5 fill-current" />
                                        ) : (
                                            <Play className="w-5 h-5 ml-0.5 fill-current" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0 py-1">
                                        <h3 className={`text-base font-bold line-clamp-2 leading-relaxed mb-1.5 transition-colors ${isCurrentEpisode ? 'text-accent-primary' : 'text-text-primary group-hover:text-text-primary'
                                            }`} title={episode.title}>
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
                                                // For currently playing episode, show real-time progress
                                                const isCurrentEp = currentEpisode?.id === episode.id;
                                                // Use actual audio duration for current episode (RSS metadata may differ)
                                                const episodeDuration = isCurrentEp && duration > 0 ? duration : (episode.duration_seconds || 1);
                                                const position = isCurrentEp ? currentTime : episode.current_position;
                                                const progressPercent = Math.min(100, Math.round((position / episodeDuration) * 100));
                                                const isFinished = episode.is_finished || (position > 0 && progressPercent >= 99);

                                                if (isFinished) {
                                                    return (
                                                        <span className="text-accent-success font-mono bg-accent-success/10 px-2 py-0.5 rounded-md text-[10px] tracking-wide">
                                                            ✓ COMPLETED
                                                        </span>
                                                    );
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
