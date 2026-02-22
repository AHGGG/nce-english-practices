/**
 * Podcast Context.
 * Manages global audio playback state and background downloads.
 */

import {
  type ReactNode,
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { useGlobalState } from "./GlobalContext";
import * as podcastApi from "../api/podcast";
import { useToast } from "../components/ui";
import {
  getCachedAudioUrl,
  downloadEpisodeForOffline,
  getOfflineEpisodeIds,
  removeOfflineEpisode,
  getStorageEstimate,
  clearPodcastCache,
} from "../utils/offline";
import {
  savePositionLocal,
  getLocalPosition,
  getLatestPosition,
} from "../utils/localProgress";

interface PodcastEpisode {
  id: number;
  title: string;
  audio_url: string;
  image_url?: string | null;
  file_size?: number;
}

interface PodcastFeed {
  id: number;
  title: string;
  image_url?: string | null;
}

interface DownloadItemState {
  status: "idle" | "downloading" | "done" | "error";
  progress: number;
  error?: string;
}

interface StorageInfo {
  used: number;
  quota: number;
  usedMB: string;
  quotaMB: string;
}

interface PlaybackQueueItem {
  episode: PodcastEpisode;
  feed: PodcastFeed;
}

interface PodcastContextValue {
  currentEpisode: PodcastEpisode | null;
  currentFeed: PodcastFeed | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  listenedSeconds: number;
  playbackRate: number;
  downloadState: Record<number, DownloadItemState>;
  offlineEpisodes: Set<number>;
  storageInfo: StorageInfo | null;
  finishedEpisodes: Set<number>;
  playEpisode: (
    episode: PodcastEpisode,
    feed: PodcastFeed,
    startPosition?: number | null,
    queue?: PlaybackQueueItem[] | null,
  ) => Promise<void>;
  togglePlayPause: () => void;
  seek: (seconds: number) => void;
  skip: (seconds: number) => void;
  stop: () => Promise<void>;
  setPlaybackRate: (rate: number) => void;
  startDownload: (episode: PodcastEpisode) => Promise<void>;
  cancelDownload: (episodeId: number) => void;
  removeDownload: (episodeId: number, audioUrl: string) => Promise<boolean>;
  clearAllDownloads: () => Promise<boolean>;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const PodcastContext = createContext<PodcastContextValue | undefined>(
  undefined,
);

export function PodcastProvider({ children }: { children: ReactNode }) {
  const { addToast } = useToast();
  const {
    state: { settings },
    actions: { updateSetting },
  } = useGlobalState();

  // Current track info
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(
    null,
  );
  const [currentFeed, setCurrentFeed] = useState<PodcastFeed | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(
    settings.podcastSpeed || 1,
  );

  // Update playback rate when settings change (in case changed from Settings page while playing)
  useEffect(() => {
    if (settings.podcastSpeed && settings.podcastSpeed !== playbackRate) {
      setPlaybackRateState(settings.podcastSpeed);
      if (audioRef.current) {
        audioRef.current.playbackRate = settings.podcastSpeed;
      }
    }
  }, [settings.podcastSpeed]);

  // Session tracking
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [listenedSeconds, setListenedSeconds] = useState(0);
  const lastUpdateRef = useRef(0);

  // Refs for use in ended event (avoids stale closures)
  const sessionIdRef = useRef<number | null>(null);
  const currentEpisodeRef = useRef<PodcastEpisode | null>(null);
  const listenedSecondsRef = useRef(0);
  const isFinishingRef = useRef(false);
  const playbackRateRef = useRef(playbackRate);
  const finalizedEpisodeIdRef = useRef<number | null>(null);
  const finalizeEpisodePlaybackRef = useRef<
    ((reason: "ended" | "near-end") => Promise<void>) | null
  >(null);
  const playbackQueueRef = useRef<PlaybackQueueItem[] | null>(null);
  const queueIndexRef = useRef(-1);
  const playNextInQueueRef = useRef<(() => Promise<void>) | null>(null);

  // Download state
  // { [episodeId]: { status: 'idle'|'downloading'|'done'|'error', progress: 0-100, error?: string } }
  const [downloadState, setDownloadState] = useState<
    Record<number, DownloadItemState>
  >({});
  const [offlineEpisodes, setOfflineEpisodes] = useState<Set<number>>(
    new Set(),
  );
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const abortControllersRef = useRef<Record<number, AbortController>>({});

  // Track finished episodes (for real-time UI updates without page refresh)
  const [finishedEpisodes, setFinishedEpisodes] = useState<Set<number>>(
    new Set(),
  );

  // Keep refs in sync with state
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    currentEpisodeRef.current = currentEpisode;
  }, [currentEpisode]);

  useEffect(() => {
    listenedSecondsRef.current = listenedSeconds;
  }, [listenedSeconds]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // Audio element ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const finalizeEpisodePlayback = useCallback(
    async (reason: "ended" | "near-end") => {
      const audio = audioRef.current;
      const episode = currentEpisodeRef.current;
      if (!audio || !episode) return;

      // Prevent double-finalize (e.g. near-end fallback + ended event)
      if (finalizedEpisodeIdRef.current === episode.id) return;
      finalizedEpisodeIdRef.current = episode.id;

      isFinishingRef.current = true;

      const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
      const finalPosition = dur > 0 ? dur : audio.currentTime || 0;

      // Ensure UI is consistent at finish
      setCurrentTime(finalPosition);
      if (dur > 0) setDuration(dur);

      // Real-time UI update for lists
      setFinishedEpisodes((prev) => new Set([...prev, episode.id]));

      // Persist local completion state
      await savePositionLocal(
        episode.id,
        finalPosition,
        playbackRateRef.current,
        true,
      ).catch(console.error);

      // Best-effort server updates (may fail offline)
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId) {
        podcastApi
          .endListeningSession(
            activeSessionId,
            listenedSecondsRef.current,
            finalPosition,
            true,
          )
          .then(() => {
            console.log(`[Podcast] Episode marked completed (${reason})`);
          })
          .catch((error) => {
            console.error("Failed to mark episode finished:", error);
          });
      }

      const localPos = await getLocalPosition(episode.id);
      if (localPos) {
        podcastApi
          .syncPosition(episode.id, {
            ...localPos,
            duration: Math.round(dur || finalPosition),
          })
          .catch((error) =>
            console.warn("Failed to sync final position/duration:", error),
          );
      }
    },
    [],
  );

  useEffect(() => {
    finalizeEpisodePlaybackRef.current = finalizeEpisodePlayback;
  }, [finalizeEpisodePlayback]);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";

      audioRef.current.addEventListener("loadedmetadata", () => {
        const audio = audioRef.current;
        if (!audio) return;
        setDuration(audio.duration);
        setIsLoading(false);
      });

      audioRef.current.addEventListener("timeupdate", () => {
        void (async () => {
          const audio = audioRef.current;
          const episode = currentEpisodeRef.current;
          if (!audio || !episode) return;

          const time = audio.currentTime;
          const dur = audio.duration;
          setCurrentTime(time);

          if (time - lastUpdateRef.current >= 5) {
            setListenedSeconds((prev) => prev + 5);
            lastUpdateRef.current = time;
          }

          // Fallback completion detection:
          // Some browsers/devices can miss 'ended' in edge cases.
          // Do NOT pause early; only finalize very close to the end.
          if (dur > 0 && time >= dur - 0.5 && !isFinishingRef.current) {
            console.log(
              "[Podcast] Near end detected (time:",
              time,
              ", duration:",
              dur,
              "), finalizing (no auto-pause)",
            );
            await finalizeEpisodePlaybackRef.current?.("near-end");
          }
        })();
      });

      audioRef.current.addEventListener("ended", () => {
        void (async () => {
          console.log("[Podcast] Ended event fired");
          setIsPlaying(false);

          await finalizeEpisodePlaybackRef.current?.("ended");
          await playNextInQueueRef.current?.();
        })();
      });

      audioRef.current.addEventListener("error", (e) => {
        const audio = audioRef.current;
        if (!audio) return;
        // Ignore error when src is empty (cleanup triggers this)
        if (!audio.src || audio.src === window.location.href) return;
        console.error("Audio error:", e, audio.error);
        setIsLoading(false);
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Sync Logic (Local + Cloud)
  useEffect(() => {
    if (!currentEpisode?.id) return;

    // 1. High-frequency Local Save (1s)
    const localSaveInterval = setInterval(() => {
      if (isPlaying && audioRef.current) {
        const position = audioRef.current.currentTime;
        savePositionLocal(currentEpisode.id, position, playbackRate).catch(
          (e) => console.warn("[Podcast] Local save failed:", e),
        );
      }
    }, 1000);

    // 2. Lower-frequency Cloud Sync (5s)
    const cloudSyncInterval = setInterval(async () => {
      if (isPlaying && sessionId) {
        // 1. Sync Analytics (Time Spent)
        // We use refs to get latest values without restarting the interval
        if (listenedSecondsRef.current > 0) {
          podcastApi
            .updateListeningSession(
              sessionId,
              listenedSecondsRef.current,
              audioRef.current?.currentTime || 0,
            )
            .catch((e) => console.warn("[Podcast] Session update failed:", e));
        }

        // 2. Sync Position (Resume State)
        const localPos = await getLocalPosition(currentEpisode.id);
        if (localPos) {
          podcastApi
            .syncPosition(currentEpisode.id, {
              position: localPos.position,
              timestamp: localPos.timestamp,
              deviceId: localPos.deviceId,
              deviceType: localPos.deviceType,
              playbackRate: localPos.playbackRate,
              isFinished: localPos.isFinished || false,
              duration: Math.round(audioRef.current?.duration || 0),
            })
            .catch((e) => console.warn("[Podcast] Cloud sync failed:", e));
        }
      }
    }, 5000);

    // Save on pause (Immediate Local + Sync)
    const handlePause = async () => {
      console.log("[Podcast] Paused, saving position");
      if (audioRef.current) {
        const pos = audioRef.current.currentTime;
        const isFinishing = isFinishingRef.current;
        const dur = audioRef.current.duration;

        await savePositionLocal(
          currentEpisode.id,
          pos,
          playbackRate,
          isFinishing,
        );
        const localPos = await getLocalPosition(currentEpisode.id);
        if (localPos) {
          podcastApi
            .syncPosition(currentEpisode.id, {
              ...localPos,
              duration: Math.round(dur),
            })
            .catch(console.error);
        }
      }
    };

    // Save on beforeunload using sendBeacon for reliability
    const handleBeforeUnload = () => {
      const currentPos = audioRef.current?.currentTime || 0;

      // If we are finishing, we should report completed status
      const isFinishing = isFinishingRef.current;
      const finalPos = isFinishing
        ? audioRef.current?.duration || currentPos
        : currentPos;

      if (currentPos > 0 || isFinishing) {
        // Legacy session update
        const data = JSON.stringify({
          session_id: sessionId,
          active_seconds: listenedSeconds,
          position_seconds: finalPos,
          is_finished: isFinishing,
        });
        navigator.sendBeacon("/api/podcast/session/update-beacon", data);

        // Also try to save locally (synchronously might not work well, but worth a try)
        // IndexedDB is async, so we can't guarantee it works in beforeunload.
        // We rely on the 1s interval having saved recently.
      }
    };

    audioRef.current?.addEventListener("pause", handlePause);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(localSaveInterval);
      clearInterval(cloudSyncInterval);
      audioRef.current?.removeEventListener("pause", handlePause);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentEpisode, isPlaying, sessionId, playbackRate]); // Removed listenedSeconds to avoid restarting interval

  // Load offline episodes and storage info on mount
  useEffect(() => {
    const ids = getOfflineEpisodeIds();
    setOfflineEpisodes(new Set(ids));
    getStorageEstimate().then(setStorageInfo);

    // Cleanup abort controllers on unmount (context rarely unmounts, but good practice)
    return () => {
      Object.values(abortControllersRef.current).forEach((controller) =>
        controller.abort(),
      );
    };
  }, []);

  // --- Download Actions ---

  const cancelDownload = useCallback((episodeId: number) => {
    const controller = abortControllersRef.current[episodeId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[episodeId];
      setDownloadState((prev) => {
        const next = { ...prev };
        delete next[episodeId];
        return next;
      });
    }
  }, []);

  const startDownload = useCallback(
    async (episode: PodcastEpisode) => {
      const episodeId = episode.id;

      // Check if already downloaded (should be handled by UI, but safety check)
      if (offlineEpisodes.has(episodeId)) {
        console.warn("[Podcast] Episode already downloaded:", episodeId);
        return;
      }

      // Setup controller
      const controller = new AbortController();
      abortControllersRef.current[episodeId] = controller;

      setDownloadState((prev) => ({
        ...prev,
        [episodeId]: { status: "downloading", progress: 0 },
      }));
      addToast("Downloading in background...", "info");

      try {
        const success = await downloadEpisodeForOffline(
          episodeId,
          episode.audio_url,
          (received: number, total: number) => {
            const progress = Math.round((received / total) * 100);
            setDownloadState((prev) => ({
              ...prev,
              [episodeId]: { status: "downloading", progress },
            }));
          },
          controller.signal,
          episode.file_size, // Pass known file size
        );

        if (success) {
          // Keep it in done state for a moment or remove if preferred
          // Here we keep it so UI shows "done" temporarily if needed,
          // but usually offlineEpisodes Set is enough.
          setDownloadState((prev) => {
            const next = { ...prev };
            delete next[episodeId];
            return next;
          });
          setOfflineEpisodes((prev) => new Set([...prev, episodeId]));
          // Update storage info
          getStorageEstimate().then(setStorageInfo);
          addToast(`Downloaded "${episode.title}"`, "success");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          // Aborted by user - handled by cancelDownload usually, but ensure state is clean
          setDownloadState((prev) => {
            const next = { ...prev };
            delete next[episodeId];
            return next;
          });
          return;
        }

        let errorMsg = getErrorMessage(error);
        // Handle quota exceeded error
        if (
          error instanceof Error &&
          (error.name === "QuotaExceededError" ||
            errorMsg.toLowerCase().includes("quota"))
        ) {
          errorMsg = "Storage full. Please free up space.";
        }

        setDownloadState((prev) => ({
          ...prev,
          [episodeId]: { status: "error", progress: 0, error: errorMsg },
        }));
        addToast(`Download failed: ${errorMsg}`, "error");
        console.error("[Download] Failed:", error);
      } finally {
        delete abortControllersRef.current[episodeId];
      }
    },
    [offlineEpisodes, addToast],
  );

  const removeDownload = useCallback(
    async (episodeId: number, audioUrl: string) => {
      const success = await removeOfflineEpisode(episodeId, audioUrl);

      if (success) {
        setOfflineEpisodes((prev) => {
          const next = new Set(prev);
          next.delete(episodeId);
          return next;
        });
        setDownloadState((prev) => {
          const next = { ...prev };
          delete next[episodeId];
          return next;
        });
        getStorageEstimate().then(setStorageInfo);
      }
      return success;
    },
    [],
  );

  const clearAllDownloads = useCallback(async () => {
    const success = await clearPodcastCache();
    if (success) {
      setOfflineEpisodes(new Set());
      setDownloadState({});
      getStorageEstimate().then(setStorageInfo);
    }
    return success;
  }, []);

  // Play an episode
  // startPosition: optional position in seconds to start from (for resume)
  const playEpisode = useCallback(
    async (
      episode: PodcastEpisode,
      feed: PodcastFeed,
      startPosition: number | null = null,
      queue: PlaybackQueueItem[] | null = null,
    ) => {
      if (!episode?.audio_url) return;

      setIsLoading(true);
      isFinishingRef.current = false; // Reset finishing flag
      finalizedEpisodeIdRef.current = null;

      // End previous session if exists
      if (sessionId && currentEpisode) {
        try {
          await podcastApi.endListeningSession(
            sessionId,
            listenedSeconds,
            audioRef.current?.currentTime || 0,
          );
        } catch (e) {
          console.error("Failed to end previous session:", e);
        }
      }

      // Set new episode
      setCurrentEpisode(episode);
      setCurrentFeed(feed);
      setListenedSeconds(0);
      lastUpdateRef.current = 0;
      finalizedEpisodeIdRef.current = null;

      if (queue && queue.length > 0) {
        const currentIndex = queue.findIndex(
          (item) => item.episode.id === episode.id,
        );
        playbackQueueRef.current = queue;
        queueIndexRef.current = currentIndex;
      } else {
        playbackQueueRef.current = null;
        queueIndexRef.current = -1;
      }

      // Get resume position (use provided startPosition or fetch from API)
      let resumePosition = startPosition;
      if (resumePosition === null) {
        try {
          // Use getLatestPosition which checks local and server (with conflict resolution)
          const { position, isFinished } = await getLatestPosition(episode.id);
          // If finished, start from beginning if they click play again
          resumePosition = isFinished ? 0 : position || 0;
        } catch (e) {
          console.error("Failed to get position:", e);
          resumePosition = 0;
        }
      }

      const audio = audioRef.current;
      if (!audio) {
        setIsLoading(false);
        return;
      }

      // Define handler for when audio metadata is loaded
      const handleLoaded = async () => {
        console.log(
          "[Podcast] loadedmetadata fired, resumePosition:",
          resumePosition,
        );

        // Seek to resume position
        if (resumePosition > 0) {
          console.log("[Podcast] Seeking to:", resumePosition);
          audio.currentTime = resumePosition;
          // Wait a tick for seek to complete
          await new Promise((resolve) => setTimeout(resolve, 100));
          console.log("[Podcast] After seek, currentTime:", audio.currentTime);
        }

        // Start session
        try {
          const { session_id } = await podcastApi.startListeningSession(
            episode.id,
            "normal",
          );
          setSessionId(session_id);
        } catch (e) {
          console.error("Failed to start session:", e);
        }

        // Apply playback rate
        if (playbackRate !== 1) {
          console.log("[Podcast] Applying playbackRate:", playbackRate);
          audio.playbackRate = playbackRate;
        }

        // Play
        try {
          await audio.play();
          setIsPlaying(true);
          console.log(
            "[Podcast] Playing from:",
            audio.currentTime,
            "at rate:",
            audio.playbackRate,
          );
        } catch (e) {
          console.error("Playback failed:", e);
        }
        setIsLoading(false);
      };

      // CRITICAL: Add listener BEFORE setting src to avoid race condition
      // The loadedmetadata event might fire immediately if audio is cached
      audio.addEventListener("loadedmetadata", handleLoaded, { once: true });

      // Try to get cached audio as Object URL (bypasses network entirely)
      const cachedUrl = await getCachedAudioUrl(episode.audio_url);
      const audioSrc = cachedUrl ?? episode.audio_url;

      // Now set the source - this triggers loading
      audio.src = audioSrc;
      console.log(
        "[Podcast] Set audio src, fromCache:",
        !!cachedUrl,
        "resumePosition:",
        resumePosition,
      );
    },
    [sessionId, currentEpisode, listenedSeconds],
  );

  const playNextInQueue = useCallback(async () => {
    const queue = playbackQueueRef.current;
    const currentIndex = queueIndexRef.current;

    if (!queue || currentIndex < 0) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      playbackQueueRef.current = null;
      queueIndexRef.current = -1;
      return;
    }

    const nextItem = queue[nextIndex];
    await playEpisode(nextItem.episode, nextItem.feed, 0, queue);
  }, [playEpisode]);

  useEffect(() => {
    playNextInQueueRef.current = playNextInQueue;
  }, [playNextInQueue]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  }, [isPlaying]);

  // Seek to position
  const seek = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        Math.min(
          audioRef.current.duration,
          audioRef.current.currentTime + seconds,
        ),
      );
    }
  }, []);

  // Set playback rate
  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (audioRef.current) {
        audioRef.current.playbackRate = rate;
      }
      setPlaybackRateState(rate);
      updateSetting("podcastSpeed", rate);
    },
    [updateSetting],
  );

  // Stop and cleanup
  const stop = useCallback(async () => {
    if (sessionId) {
      try {
        await podcastApi.endListeningSession(
          sessionId,
          listenedSeconds,
          audioRef.current?.currentTime || 0,
        );
      } catch (e) {
        console.error("Failed to end session:", e);
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    setCurrentEpisode(null);
    setCurrentFeed(null);
    setIsPlaying(false);
    setSessionId(null);
    setListenedSeconds(0);
    playbackQueueRef.current = null;
    queueIndexRef.current = -1;
  }, [sessionId, listenedSeconds]);

  const value: PodcastContextValue = {
    // Playback State
    currentEpisode,
    currentFeed,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    listenedSeconds,
    playbackRate,

    // Download State
    downloadState,
    offlineEpisodes,
    storageInfo,
    finishedEpisodes,

    // Playback Actions
    playEpisode,
    togglePlayPause,
    seek,
    skip,
    stop,
    setPlaybackRate,

    // Download Actions
    startDownload,
    cancelDownload,
    removeDownload,
    clearAllDownloads,
  };

  return (
    <PodcastContext.Provider value={value}>{children}</PodcastContext.Provider>
  );
}

export function usePodcast() {
  const context = useContext(PodcastContext);
  if (!context) {
    throw new Error("usePodcast must be used within PodcastProvider");
  }
  return context;
}

export default PodcastContext;

export type {
  PodcastEpisode,
  PodcastFeed,
  PlaybackQueueItem,
  DownloadItemState,
  StorageInfo,
  PodcastContextValue,
};
