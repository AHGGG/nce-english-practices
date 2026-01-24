/**
 * Podcast Downloads View - Shows all downloaded episodes for offline playback.
 * Includes storage management and episode list with playback controls.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Play, Pause, Trash2, Loader2, CloudOff, HardDrive,
    Clock, AlertCircle, Music, RefreshCw, Check
} from 'lucide-react';
import PodcastLayout from '../../components/podcast/PodcastLayout';
import { usePodcast } from '../../context/PodcastContext';
import {
    getOfflineEpisodeIds,
    removeOfflineEpisode,
    getStorageEstimate,
    clearPodcastCache
} from '../../utils/offline';
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
    const { currentEpisode, isPlaying, currentTime, duration, playEpisode, togglePlayPause } = usePodcast();
    const { addToast } = useToast();

    const [episodes, setEpisodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [storageInfo, setStorageInfo] = useState(null);
    const [deleting, setDeleting] = useState({});
    const [clearing, setClearing] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Load offline episodes
    const loadOfflineEpisodes = useCallback(async () => {
        setLoading(true);
        try {
            const offlineIds = getOfflineEpisodeIds();

            if (offlineIds.length === 0) {
                setEpisodes([]);
                return;
            }

            // Get recently played to get episode details
            // Note: In a real app, you'd store episode metadata in IndexedDB
            const recentlyPlayed = await podcastApi.getRecentlyPlayed(50);

            // Filter to only show offline episodes
            const offlineEpisodes = recentlyPlayed.filter(
                item => offlineIds.includes(item.episode.id)
            );

            // Also get feeds to include episodes that haven't been played yet
            const feeds = await podcastApi.getSubscriptions();

            for (const feed of feeds) {
                try {
                    const feedDetail = await podcastApi.getFeedDetail(feed.id);
                    for (const ep of feedDetail.episodes) {
                        if (offlineIds.includes(ep.id) &&
                            !offlineEpisodes.find(oe => oe.episode.id === ep.id)) {
                            offlineEpisodes.push({
                                episode: ep,
                                feed: { id: feed.id, title: feed.title, image_url: feed.image_url },
                                last_position_seconds: ep.current_position || 0,
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to load feed ${feed.id}:`, e);
                }
            }

            setEpisodes(offlineEpisodes);
        } catch (e) {
            console.error('Failed to load offline episodes:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOfflineEpisodes();
        getStorageEstimate().then(setStorageInfo);
    }, [loadOfflineEpisodes]);

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
        const proxyUrl = `/api/podcast/episode/${episodeId}/download`;

        setDeleting(prev => ({ ...prev, [episodeId]: true }));

        try {
            await removeOfflineEpisode(episodeId, proxyUrl);
            setEpisodes(prev => prev.filter(ep => ep.episode.id !== episodeId));
            getStorageEstimate().then(setStorageInfo);
            addToast('Episode removed', 'success');
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
            await clearPodcastCache();
            setEpisodes([]);
            getStorageEstimate().then(setStorageInfo);
            addToast('All downloads cleared', 'success');
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
                                    onClick={loadOfflineEpisodes}
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
                {loading ? (
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
                                    {/* Play button */}
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
                                            <span className="flex items-center gap-1 text-accent-success">
                                                <CloudOff className="w-3 h-3" />
                                                Offline
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delete button */}
                                    <button
                                        onClick={() => handleDelete(item)}
                                        disabled={deleting[ep.id]}
                                        className="flex-shrink-0 p-3 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Remove download"
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
