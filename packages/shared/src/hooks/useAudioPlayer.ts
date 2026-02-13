/**
 * useAudioPlayer - Cross-platform audio playback hook for audiobooks
 *
 * Features:
 * - Audio playback control (play, pause, seek, playback rate)
 * - Segment tracking for subtitle sync
 * - Time update events for progress display
 *
 * Usage:
 * ```tsx
 * const { state, actions, audioRef } = useAudioPlayer({
 *   audioUrl: '/api/content/audiobook/book1/audio',
 *   segments: [{ index: 0, text: 'Hello', sentences: ['Hello'], startTime: 0, endTime: 2 }],
 *   onSegmentChange: (index) => console.log('Active segment:', index),
 * });
 * ```
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

// ============================================================
// Types
// ============================================================

export interface AudioSegment {
  index: number;
  text: string;
  sentences: string[];
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface UseAudioPlayerOptions {
  /** Audio file URL */
  audioUrl: string;

  /** Subtitle segments for sync */
  segments?: AudioSegment[];

  /** Callback when active segment changes */
  onSegmentChange?: (index: number) => void;

  /** Initial playback rate (default: 1.0) */
  initialPlaybackRate?: number;

  /** Auto-play when audio loads (default: false) */
  autoPlay?: boolean;
}

export interface AudioPlayerState {
  /** Whether audio is currently playing */
  isPlaying: boolean;

  /** Whether audio is loading/buffering */
  isLoading: boolean;

  /** Current playback position in seconds */
  currentTime: number;

  /** Total duration in seconds */
  duration: number;

  /** Playback rate (0.5 - 2.0) */
  playbackRate: number;

  /** Currently active segment index (-1 if none) */
  activeSegmentIndex: number;

  /** Progress percentage (0-100) */
  progress: number;

  /** Loop mode: off | current subtitle segment | A-B */
  loopMode: "off" | "segment" | "ab";

  /** A-B loop start in seconds */
  loopStart: number | null;

  /** A-B loop end in seconds */
  loopEnd: number | null;
}

export interface AudioPlayerActions {
  /** Start playback */
  play: () => Promise<void>;

  /** Pause playback */
  pause: () => void;

  /** Toggle play/pause */
  togglePlay: () => void;

  /** Seek to specific time in seconds */
  seekTo: (seconds: number) => void;

  /** Seek to start of a specific segment */
  seekToSegment: (index: number) => void;

  /** Set playback rate */
  setPlaybackRate: (rate: number) => void;

  /** Skip forward/backward by seconds */
  skip: (seconds: number) => void;

  /** Toggle current-segment loop */
  toggleSegmentLoop: () => void;

  /** Set A marker at current time and enable A-B mode */
  setABStart: () => void;

  /** Set B marker at current time and enable A-B mode */
  setABEnd: () => void;

  /** Clear A-B markers and disable A-B loop */
  clearABLoop: () => void;

  /** Toggle A-B loop (requires both A and B markers) */
  toggleABLoop: () => void;
}

export interface UseAudioPlayerReturn {
  state: AudioPlayerState;
  actions: AudioPlayerActions;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_PLAYBACK_RATE = 1.0;
const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const SEGMENT_SYNC_TOLERANCE_SECONDS = 0.35;

function findActiveSegmentIndex(
  time: number,
  segments: AudioSegment[],
  tolerance: number,
): number {
  if (segments.length === 0) return -1;

  // Binary search around current playback position.
  let left = 0;
  let right = segments.length - 1;
  let candidate = -1;
  const target = time + tolerance;

  while (left <= right) {
    const mid = (left + right) >> 1;
    if (segments[mid].startTime <= target) {
      candidate = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  // Check nearby segments to avoid missing short cues between sparse timeupdate ticks.
  const start = Math.max(0, candidate - 2);
  const end = Math.min(segments.length - 1, candidate + 2);
  for (let i = start; i <= end; i++) {
    const seg = segments[i];
    if (time >= seg.startTime - tolerance && time < seg.endTime + tolerance) {
      return i;
    }
  }

  // If in a short gap, snap to the next upcoming segment within tolerance.
  const nextIndex = Math.min(candidate + 1, segments.length - 1);
  const nextSeg = segments[nextIndex];
  if (
    nextSeg &&
    nextSeg.startTime > time &&
    nextSeg.startTime - time <= tolerance
  ) {
    return nextIndex;
  }

  // If playback is past all segments, keep the final segment active.
  if (time >= segments[segments.length - 1].endTime) {
    return segments.length - 1;
  }

  return -1;
}

// ============================================================
// Hook Implementation
// ============================================================

export function useAudioPlayer(
  options: UseAudioPlayerOptions,
): UseAudioPlayerReturn {
  const {
    audioUrl,
    segments = [],
    onSegmentChange,
    initialPlaybackRate = DEFAULT_PLAYBACK_RATE,
    autoPlay = false,
  } = options;

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSegmentIndexRef = useRef<number>(-1);

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(initialPlaybackRate);
  const [loopMode, setLoopMode] = useState<"off" | "segment" | "ab">("off");
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const lastLoopJumpRef = useRef(0);

  // Computed: active segment index
  const activeSegmentIndex = useMemo(() => {
    return findActiveSegmentIndex(
      currentTime,
      segments,
      SEGMENT_SYNC_TOLERANCE_SECONDS,
    );
  }, [currentTime, segments]);

  // Computed: progress percentage
  const progress = useMemo(() => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  // Notify segment change
  useEffect(() => {
    if (activeSegmentIndex !== lastSegmentIndexRef.current) {
      lastSegmentIndexRef.current = activeSegmentIndex;
      onSegmentChange?.(activeSegmentIndex);
    }
  }, [activeSegmentIndex, onSegmentChange]);

  // Initialize audio element and event listeners
  useEffect(() => {
    // Create audio element if not exists
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }

    const audio = audioRef.current;

    // Set audio source
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.playbackRate = playbackRate;
      setIsLoading(true);
    }

    // Event handlers
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      if (autoPlay) {
        audio.play().catch(console.error);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error("[useAudioPlayer] Audio error:", e);
      setIsLoading(false);
      setIsPlaying(false);
    };

    // Attach listeners
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    // Cleanup
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
    };
  }, [audioUrl, autoPlay, playbackRate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Actions
  const play = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
    } catch (error) {
      console.error("[useAudioPlayer] Play failed:", error);
    }
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seekTo = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const clampedTime = Math.max(
      0,
      Math.min(seconds, audioRef.current.duration || 0),
    );
    audioRef.current.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, []);

  const seekToSegment = useCallback(
    (index: number) => {
      if (index < 0 || index >= segments.length) return;
      const segment = segments[index];
      seekTo(segment.startTime);
    },
    [segments, seekTo],
  );

  const setPlaybackRate = useCallback((rate: number) => {
    // Clamp to valid range
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    if (audioRef.current) {
      audioRef.current.playbackRate = clampedRate;
    }
    setPlaybackRateState(clampedRate);
  }, []);

  const skip = useCallback(
    (seconds: number) => {
      seekTo(currentTime + seconds);
    },
    [currentTime, seekTo],
  );

  const toggleSegmentLoop = useCallback(() => {
    setLoopMode((prev) => (prev === "segment" ? "off" : "segment"));
  }, []);

  const setABStart = useCallback(() => {
    setLoopStart(currentTime);
    setLoopEnd((prev) => (prev != null && prev <= currentTime ? null : prev));
    setLoopMode("ab");
  }, [currentTime]);

  const setABEnd = useCallback(() => {
    const nextEnd =
      loopStart != null && currentTime <= loopStart
        ? loopStart + 0.1
        : currentTime;
    setLoopEnd(nextEnd);
    setLoopMode("ab");
  }, [currentTime, loopStart]);

  const clearABLoop = useCallback(() => {
    setLoopStart(null);
    setLoopEnd(null);
    setLoopMode((prev) => (prev === "ab" ? "off" : prev));
  }, []);

  const toggleABLoop = useCallback(() => {
    setLoopMode((prev) => {
      if (prev === "ab") return "off";
      if (loopStart != null && loopEnd != null && loopEnd > loopStart)
        return "ab";
      return prev;
    });
  }, [loopStart, loopEnd]);

  useEffect(() => {
    const now = performance.now();
    if (now - lastLoopJumpRef.current < 120) {
      return;
    }

    if (loopMode === "segment" && activeSegmentIndex >= 0) {
      const seg = segments[activeSegmentIndex];
      if (seg && currentTime >= seg.endTime - 0.03) {
        seekTo(seg.startTime);
        lastLoopJumpRef.current = now;
      }
      return;
    }

    if (
      loopMode === "ab" &&
      loopStart != null &&
      loopEnd != null &&
      loopEnd > loopStart &&
      currentTime >= loopEnd - 0.03
    ) {
      seekTo(loopStart);
      lastLoopJumpRef.current = now;
    }
  }, [
    loopMode,
    activeSegmentIndex,
    segments,
    currentTime,
    loopStart,
    loopEnd,
    seekTo,
  ]);

  // Build return object
  const state: AudioPlayerState = {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    playbackRate,
    activeSegmentIndex,
    progress,
    loopMode,
    loopStart,
    loopEnd,
  };

  const actions: AudioPlayerActions = {
    play,
    pause,
    togglePlay,
    seekTo,
    seekToSegment,
    setPlaybackRate,
    skip,
    toggleSegmentLoop,
    setABStart,
    setABEnd,
    clearABLoop,
    toggleABLoop,
  };

  return { state, actions, audioRef };
}

// Export constants for external use
export { PLAYBACK_RATES };

export default useAudioPlayer;
