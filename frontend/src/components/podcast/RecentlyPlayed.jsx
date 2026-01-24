/**
 * RecentlyPlayed - Shows episodes with incomplete playback for quick resume.
 */

import { useState, useEffect } from 'react';
import { Play, Clock, Loader2 } from 'lucide-react';
import * as podcastApi from '../../api/podcast';
import { usePodcast } from '../../context/PodcastContext';

function formatTime(seconds) {
    if (!seconds || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatProgress(position, duration) {
    if (!duration) return 0;
    return Math.min(100, Math.round((position / duration) * 100));
}

export default function RecentlyPlayed() {
    const { playEpisode, currentEpisode, currentTime, duration } = usePodcast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecentlyPlayed();
    }, []);

    async function loadRecentlyPlayed() {
        try {
            setLoading(true);
            const data = await podcastApi.getRecentlyPlayed(5);

            // Filter out completed episodes (where position >= duration)
            // This handles legacy data where is_finished might be false in DB
            const filtered = data.filter(item => {
                const position = item.last_position_seconds || 0;
                const duration = item.episode.duration_seconds || 0;
                if (!duration) return true; // Keep if unknown duration
                const remaining = Math.max(0, duration - position);
                return remaining > 10; // Filter if less than 10 seconds remaining (effectively finished)
            });

            setItems(filtered);
        } catch (e) {
            console.error('Failed to load recently played:', e);
        } finally {
            setLoading(false);
        }
    }

    function handleResume(item) {
        console.log('[RecentlyPlayed] handleResume called with item:', item);
        console.log('[RecentlyPlayed] last_position_seconds:', item.last_position_seconds);

        const episode = {
            id: item.episode.id,
            title: item.episode.title,
            audio_url: item.episode.audio_url,
            duration_seconds: item.episode.duration_seconds,
            image_url: item.episode.image_url,
        };
        const feed = {
            id: item.feed.id,
            title: item.feed.title,
            image_url: item.feed.image_url,
        };
        // Pass the last position to resume from
        playEpisode(episode, feed, item.last_position_seconds);
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

                    // For currently playing episode, use real-time values from audio context
                    // This avoids mismatch between RSS metadata duration and actual audio duration
                    const position = isCurrentEp ? currentTime : (item.last_position_seconds || 0);
                    const episodeDuration = isCurrentEp && duration > 0 ? duration : (item.episode.duration_seconds || 0);

                    const progress = formatProgress(position, episodeDuration);
                    const remainingTime = Math.max(0, episodeDuration - position); // Clamp to 0

                    return (
                        <button
                            key={item.episode.id}
                            onClick={() => handleResume(item)}
                            className={`flex-shrink-0 w-32 sm:w-48 bg-bg-surface border rounded-xl overflow-hidden hover:border-accent-primary/50 transition-all group ${isCurrentEp ? 'border-accent-primary' : 'border-border'
                                }`}
                        >
                            <div className="relative aspect-square">
                                {(item.episode.image_url || item.feed.image_url) ? (
                                    <img
                                        src={item.episode.image_url || item.feed.image_url}
                                        alt=""
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                                        <Play className="w-8 h-8 text-text-muted" />
                                    </div>
                                )}

                                {/* Play overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-accent-primary rounded-full flex items-center justify-center">
                                        <Play className="w-4 h-4 sm:w-5 sm:h-5 text-black ml-0.5" />
                                    </div>
                                </div>

                                {/* Progress bar */}
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
                                    {remainingTime > 0 ? `${formatTime(remainingTime)} left` : '✓ Completed'}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
