/**
 * RecentlyPlayed - Shows episodes with incomplete playback for quick resume.
 */

import { useState, useEffect } from 'react';
import { Play, Clock, Loader2 } from 'lucide-react';
import * as podcastApi from '../../api/podcast';
import { usePodcast } from '../../context/PodcastContext';

function formatTime(seconds) {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatProgress(position, duration) {
    if (!duration) return 0;
    return Math.round((position / duration) * 100);
}

export default function RecentlyPlayed() {
    const { playEpisode, currentEpisode } = usePodcast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecentlyPlayed();
    }, []);

    async function loadRecentlyPlayed() {
        try {
            setLoading(true);
            const data = await podcastApi.getRecentlyPlayed(5);
            setItems(data);
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
                    const isPlaying = currentEpisode?.id === item.episode.id;
                    const progress = formatProgress(item.last_position_seconds, item.episode.duration_seconds);

                    return (
                        <button
                            key={item.episode.id}
                            onClick={() => handleResume(item)}
                            className={`flex-shrink-0 w-48 bg-bg-surface border rounded-xl overflow-hidden hover:border-accent-primary/50 transition-all group ${isPlaying ? 'border-accent-primary' : 'border-border'
                                }`}
                        >
                            <div className="relative aspect-square">
                                {(item.episode.image_url || item.feed.image_url) ? (
                                    <img
                                        src={item.episode.image_url || item.feed.image_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                                        <Play className="w-8 h-8 text-text-muted" />
                                    </div>
                                )}

                                {/* Play overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center">
                                        <Play className="w-5 h-5 text-black ml-0.5" />
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-base/80">
                                    <div
                                        className="h-full bg-accent-primary"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-3 text-left">
                                <p className="text-sm font-medium text-text-primary truncate">
                                    {item.episode.title}
                                </p>
                                <p className="text-xs text-text-muted truncate">
                                    {item.feed.title}
                                </p>
                                <p className="text-xs text-accent-primary/70 font-mono mt-1">
                                    {formatTime((item.episode.duration_seconds || 0) - (item.last_position_seconds || 0))} left
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
