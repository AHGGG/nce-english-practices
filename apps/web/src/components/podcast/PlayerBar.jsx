/**
 * PlayerBar - Persistent footer player for podcast playback.
 * Enhanced with playback speed control and improved styling.
 */

import { usePodcast } from '../../context/PodcastContext';
import { Play, Pause, SkipBack, SkipForward, X, Loader2, Gauge } from 'lucide-react';
import { useState } from 'react';

function formatTime(seconds) {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function PlayerBar() {
    const {
        currentEpisode,
        currentFeed,
        isPlaying,
        isLoading,
        currentTime,
        duration,
        playbackRate,
        togglePlayPause,
        skip,
        seek,
        stop,
        setPlaybackRate,
    } = usePodcast();

    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    if (!currentEpisode) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-bg-surface via-bg-surface to-bg-elevated border-t border-accent-primary/30 z-50 shadow-2xl shadow-accent-primary/10">
            {/* Progress bar */}
            <div
                className="h-2 bg-bg-base cursor-pointer group relative"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    seek(percent * duration);
                }}
            >
                {/* Progress fill */}
                <div
                    className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all"
                    style={{ width: `${progress}%` }}
                />
                {/* Prominent thumb indicator - always visible */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent-primary shadow-lg shadow-accent-primary/50 border-2 border-white/80 transition-transform hover:scale-125"
                    style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
                />
            </div>

            <div className="flex items-center gap-4 px-4 py-3 md:px-6">
                {/* Episode info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                        {currentEpisode.image_url || currentFeed?.image_url ? (
                            <img
                                src={currentEpisode.image_url || currentFeed?.image_url}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-14 h-14 rounded-lg object-cover border border-border"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-lg bg-bg-elevated flex items-center justify-center border border-border">
                                <Play className="w-6 h-6 text-accent-primary" />
                            </div>
                        )}
                        {/* Playing indicator */}
                        {isPlaying && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent-primary rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                            {currentEpisode.title}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                            {currentFeed?.title}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 md:gap-2">
                    <button
                        onClick={() => skip(-15)}
                        className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                        title="Back 15s"
                    >
                        <SkipBack className="w-5 h-5" />
                    </button>

                    <button
                        onClick={togglePlayPause}
                        disabled={isLoading}
                        className="p-3 md:p-4 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full text-black hover:shadow-lg hover:shadow-accent-primary/30 transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                        ) : isPlaying ? (
                            <Pause className="w-5 h-5 md:w-6 md:h-6" />
                        ) : (
                            <Play className="w-5 h-5 md:w-6 md:h-6 ml-0.5" />
                        )}
                    </button>

                    <button
                        onClick={() => skip(30)}
                        className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                        title="Forward 30s"
                    >
                        <SkipForward className="w-5 h-5" />
                    </button>
                </div>

                {/* Speed control - visible on all sizes */}
                <div className="relative">
                    <button
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm bg-bg-elevated rounded-lg text-text-primary hover:bg-bg-base transition-colors border border-border"
                    >
                        <Gauge className="w-3 h-3 md:w-4 md:h-4 text-accent-primary" />
                        <span className="font-mono">{playbackRate}x</span>
                    </button>

                    {showSpeedMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowSpeedMenu(false)}
                            />
                            <div className="absolute bottom-full mb-2 right-0 bg-bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden min-w-[80px] md:min-w-[100px]">
                                {SPEED_OPTIONS.map((speed) => (
                                    <button
                                        key={speed}
                                        onClick={() => {
                                            setPlaybackRate(speed);
                                            setShowSpeedMenu(false);
                                        }}
                                        className={`w-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-left font-mono transition-colors ${playbackRate === speed
                                            ? 'bg-accent-primary/20 text-accent-primary'
                                            : 'text-text-primary hover:bg-bg-elevated'
                                            }`}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Time */}
                <div className="text-xs text-text-muted font-mono w-28 text-right hidden sm:block">
                    <span className="text-accent-primary">{formatTime(currentTime)}</span>
                    <span className="mx-1">/</span>
                    <span>{formatTime(duration)}</span>
                </div>

                {/* Close */}
                <button
                    onClick={stop}
                    className="p-2 text-text-muted hover:text-red-400 transition-colors"
                    title="Close player"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
