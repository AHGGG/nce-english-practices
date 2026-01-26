/**
 * Podcast Downloads View - Shows all downloaded episodes for offline playback.
 * Includes storage management and episode list with playback controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Play, Pause, Trash2, Loader2, CloudOff, HardDrive,
    Clock, AlertCircle, Music, RefreshCw, Check, Download
} from 'lucide-react';
import PodcastLayout from '../../components/podcast/PodcastLayout';
import { usePodcast } from '../../context/PodcastContext';
import * as podcastApi from '../../api/podcast';
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

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function PodcastDownloadsView() {
    const navigate = useNavigate();
    const { 
        currentEpisode, isPlaying, currentTime, duration, playEpisode, togglePlayPause,
        // Use context for offline state and downloads
        offlineEpisodes, storageInfo, removeDownload, clearAllDownloads,
        downloadState, cancelDownload
    } = usePodcast();
    const { addToast } = useToast();

    const [episodes, setEpisodes] = useState([]);
    const [downloadingEpisodes, setDownloadingEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    // storageInfo is now from context
    const [deleting, setDeleting] = useState({});
    const [clearing, setClearing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Load offline episodes
    const loadEpisodes = useCallback(async () => {
        // Collect IDs: both completed (offlineEpisodes) and currently downloading (downloadState)
        const offlineIds = Array.from(offlineEpisodes);
        const downloadingIds = Object.keys(downloadState).map(Number);
        
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
            const episodesData = await podcastApi.getEpisodesBatch(allIds);
            
            // Sort by recently added (reverse order of allIds)
            // offlineEpisodes preserves insertion order (oldest -> newest)
            // downloadingIds are added at the end
            // We want Newest -> Oldest
            const epMap = new Map(episodesData.map(e => [e.episode.id, e]));
            
            const sortedEpisodes = [...allIds].reverse()
                .map(id => epMap.get(id))
                .filter(Boolean); // Remove undefined if id not found in response

            setEpisodes(sortedEpisodes);
        } catch (e) {
            console.error('Failed to load episodes:', e);
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

    const handlePlay = (item) => {
        if (currentEpisode?.id === item.episode.id) {
            togglePlayPause();
        } else {
            // Pass resume position from episode data
            const resumePosition = item.last_position_seconds || item.episode?.current_position || 0;
            playEpisode(item.episode, item.feed, resumePosition);
        }
    };

    const handleDelete = async (item) => {
        const episodeId = item.episode.id;
        
        // If it's downloading, cancel it
        if (downloadState[episodeId]?.status === 'downloading') {
            cancelDownload(episodeId);
            setEpisodes(prev => prev.filter(ep => ep.episode.id !== episodeId));
            return;
        }

        setDeleting(prev => ({ ...prev, [episodeId]: true }));

        try {
            const success = await removeDownload(episodeId);
            if (success) {
                // List update is handled by useEffect on offlineEpisodes change
                // but we can optimistically filter locally to avoid flicker
                setEpisodes(prev => prev.filter(ep => ep.episode.id !== episodeId));
                addToast('Episode removed', 'success');
            } else {
                addToast('Failed to remove episode', 'error');
            }
        } catch (e) {
            addToast('Failed to remove: ' + e.message, 'error');
        } finally {
            setDeleting(prev => ({ ...prev, [episodeId]: false }));
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
                addToast('All downloads cleared', 'success');
            } else {
                addToast('Failed to clear cache', 'error');
            }
        } catch (e) {
            addToast('Failed to clear cache: ' + e.message, 'error');
        } finally {
            setClearing(false);
        }
    };

    return (
        <PodcastLayout title="Downloads">
            <div className="space-y-6">
                {/* Storage card */}
                <div className="p-6 bg-bg-surface border border-border rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-accent-success/20 rounded-xl">
                                <CloudOff className="w-8 h-8 text-accent-success" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold font-serif text-text-primary">
                                    Offline Episodes
                                </h2>
                                <p className="text-sm text-text-muted">
                                    {episodes.length} episodes downloaded
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Storage bar */}
                            {storageInfo && (
                                <div className="hidden sm:block">
                                    <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
                                        <HardDrive className="w-4 h-4" />
                                        <span className="font-mono">{storageInfo.usedMB} MB used</span>
                                    </div>
                                    <div className="w-32 h-2 bg-bg-base rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                                            style={{
                                                width: `${Math.min((storageInfo.used / storageInfo.quota) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={loadEpisodes}
                                    className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
                                    title="Refresh list"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                </button>

                                {episodes.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        disabled={clearing}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Clear all downloads"
                                    >
                                        {clearing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        <span className="hidden sm:inline">Clear All</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Episode list */}
                {loading && episodes.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
                    </div>
                ) : episodes.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                        <div className="p-4 bg-bg-surface rounded-2xl inline-block">
                            <Music className="w-12 h-12 text-text-muted" />
                        </div>
                        <div>
                            <p className="text-text-primary font-medium">No downloads yet</p>
                            <p className="text-sm text-text-muted mt-1">
                                Download episodes from your subscribed podcasts to listen offline.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/podcast')}
                            className="mt-4 px-6 py-2 bg-accent-primary text-black font-medium rounded-lg hover:bg-accent-primary/90 transition-colors"
                        >
                            Browse Library
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {episodes.map((item) => {
                            const isCurrentEpisode = currentEpisode?.id === item.episode.id;
                            const ep = item.episode;
                            const dState = downloadState[ep.id];
                            const isDownloading = dState?.status === 'downloading';
                            const isError = dState?.status === 'error';

                            // Calculate completion status
                            const isCurrentEp = currentEpisode?.id === ep.id;
                            const episodeDuration = isCurrentEp && duration > 0 ? duration : (ep.duration_seconds || 1);
                            const position = isCurrentEp ? currentTime : (item.last_position_seconds || ep.current_position || 0);
                            const progressPercent = Math.min(100, Math.round((position / episodeDuration) * 100));
                            const isFinished = item.is_finished || (position > 0 && progressPercent >= 99);

                            return (
                                <div
                                    key={ep.id}
                                    className={`relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${isCurrentEpisode
                                        ? 'bg-accent-primary/10 border border-accent-primary/30 shadow-lg shadow-accent-primary/10'
                                        : isFinished
                                            ? 'opacity-50 bg-bg-surface/50'
                                            : 'bg-bg-surface border border-transparent hover:border-accent-primary/20 hover:shadow-lg'
                                        }`}
                                >
                                    {/* Play button or Download Spinner */}
                                    {isDownloading ? (
                                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                                            <div className="relative w-10 h-10">
                                                <svg className="w-10 h-10 -rotate-90">
                                                    <circle
                                                        cx="20" cy="20" r="16" strokeWidth="3"
                                                        stroke="currentColor" fill="none" className="text-bg-elevated"
                                                    />
                                                    <circle
                                                        cx="20" cy="20" r="16" strokeWidth="3"
                                                        stroke="currentColor" fill="none" className="text-accent-primary"
                                                        strokeDasharray={`${dState.progress} 100`}
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-accent-primary">
                                                    {dState.progress}%
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handlePlay(item)}
                                            className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCurrentEpisode
                                                ? 'bg-gradient-to-br from-accent-primary to-accent-secondary text-black shadow-lg shadow-accent-primary/30'
                                                : isFinished
                                                    ? 'bg-transparent border-2 border-accent-success/40 text-accent-success hover:border-accent-success hover:bg-accent-success/10'
                                                    : 'bg-bg-elevated/30 border border-white/10 text-text-primary hover:bg-bg-elevated hover:border-white/20 hover:scale-105'
                                                }`}
                                        >
                                            {isCurrentEpisode && isPlaying ? (
                                                <Pause className="w-5 h-5" />
                                            ) : isFinished && !isCurrentEpisode ? (
                                                <Check className="w-5 h-5 stroke-[2.5]" />
                                            ) : (
                                                <Play className="w-5 h-5 ml-0.5" />
                                            )}
                                        </button>
                                    )}

                                    {/* Episode info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`truncate ${isCurrentEpisode
                                            ? 'text-accent-primary font-medium'
                                            : isFinished
                                                ? 'text-gray-400 line-through decoration-accent-success/60 decoration-2'
                                                : 'text-text-primary font-medium'
                                            }`}>
                                            {ep.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                                            <span className="truncate max-w-[120px]">{item.feed.title}</span>
                                            {ep.duration_seconds && (
                                                <span className="flex items-center gap-1 font-mono">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDuration(ep.duration_seconds)}
                                                </span>
                                            )}
                                            {(() => {
                                                if (isDownloading) return null;
                                                if (isFinished) {
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
                                            
                                            {isDownloading ? (
                                                <span className="flex items-center gap-1 text-accent-primary animate-pulse">
                                                    <Download className="w-3 h-3" />
                                                    Downloading...
                                                </span>
                                            ) : isError ? (
                                                <span className="flex items-center gap-1 text-red-400">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Failed
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-accent-success">
                                                    <CloudOff className="w-3 h-3" />
                                                    Offline
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Delete/Cancel button */}
                                    <button
                                        onClick={() => handleDelete(item)}
                                        disabled={deleting[ep.id]}
                                        className="flex-shrink-0 p-3 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title={isDownloading ? "Cancel download" : "Remove download"}
                                    >
                                        {deleting[ep.id] ? (
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
                            <DialogButton
                                variant="danger"
                                onClick={performClearAll}
                            >
                                Clear All
                            </DialogButton>
                        </>
                    }
                >
                    <p>Are you sure you want to remove all downloaded episodes? This cannot be undone.</p>
                </Dialog>
            </div>
        </PodcastLayout>
    );
}
