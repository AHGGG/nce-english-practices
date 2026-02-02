/**
 * PlayerBar - Persistent footer player for podcast playback.
 * Enhanced with playback speed control and improved styling.
 */

import { usePodcast } from "../../context/PodcastContext";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Loader2,
  Gauge,
} from "lucide-react";
import { useState } from "react";

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  const [isHoveringProgress, setIsHoveringProgress] = useState(false);

  if (!currentEpisode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/[0.02] backdrop-blur-xl border-t border-white/[0.08] z-50 shadow-2xl shadow-black/50">
      {/* Progress bar container */}
      <div
        className="h-1 bg-white/[0.1] cursor-pointer group relative transition-all duration-300 hover:h-2"
        onMouseEnter={() => setIsHoveringProgress(true)}
        onMouseLeave={() => setIsHoveringProgress(false)}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          seek(percent * duration);
        }}
      >
        {/* Progress fill */}
        <div
          className="h-full bg-accent-primary shadow-[0_0_10px_rgba(var(--color-accent-primary-rgb),0.5)] transition-all duration-100 ease-linear relative"
          style={{ width: `${progress}%` }}
        >
          {/* Glow effect at the tip */}
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/50" />
        </div>

        {/* Prominent thumb indicator - visible on hover or drag */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-200 pointer-events-none ${isHoveringProgress ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
          style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
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
                className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover border border-white/10 shadow-lg"
              />
            ) : (
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-md bg-white/5 flex items-center justify-center border border-white/10">
                <Play className="w-5 h-5 md:w-6 md:h-6 text-accent-primary" />
              </div>
            )}
            {/* Playing indicator */}
            {isPlaying && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-bg-base rounded-full flex items-center justify-center border border-white/10">
                <div className="w-3 h-3 bg-accent-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--color-accent-primary-rgb),0.8)]" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <p className="text-sm font-semibold text-white truncate drop-shadow-sm">
              {currentEpisode.title}
            </p>
            <p className="text-xs text-white/50 truncate hover:text-accent-primary transition-colors cursor-pointer">
              {currentFeed?.title}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => skip(-15)}
            className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Back 15s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="p-3 bg-accent-primary text-black rounded-full hover:bg-accent-primary/90 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.4)]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skip(30)}
            className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            title="Forward 30s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm bg-white/5 rounded-lg text-white hover:bg-white/10 transition-colors border border-white/10"
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
              <div className="absolute bottom-full mb-2 right-0 bg-bg-surface border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden min-w-[80px] md:min-w-[100px] backdrop-blur-xl">
                {SPEED_OPTIONS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setPlaybackRate(speed);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm text-left font-mono transition-colors ${
                      playbackRate === speed
                        ? "bg-accent-primary/20 text-accent-primary"
                        : "text-white hover:bg-white/5"
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
        <div className="text-xs text-white/50 font-mono w-28 text-right hidden sm:block">
          <span className="text-accent-primary">{formatTime(currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Close */}
        <button
          onClick={stop}
          className="p-2 text-white/50 hover:text-red-400 transition-colors hover:bg-white/5 rounded-full"
          title="Close player"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
