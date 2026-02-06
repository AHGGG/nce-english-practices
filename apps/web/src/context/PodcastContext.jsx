/**
 * Podcast Context.
 * Manages global audio playback state and background downloads.
 */

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { useGlobalState } from "./GlobalContext";
import * as podcastApi from "../api/podcast";
import { authFetch } from "../api/auth";
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
  getDeviceId,
  getDeviceType,
} from "../utils/localProgress";

const PodcastContext = createContext(null);

export function PodcastProvider({ children }) {
  const { addToast } = useToast();
  const {
    state: { settings },
    actions: { updateSetting },
  } = useGlobalState();

  // Current track info
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [currentFeed, setCurrentFeed] = useState(null);

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
  const [sessionId, setSessionId] = useState(null);
  const [listenedSeconds, setListenedSeconds] = useState(0);
  const lastUpdateRef = useRef(0);

  // Refs for use in ended event (avoids stale closures)
  const sessionIdRef = useRef(null);
  const currentEpisodeRef = useRef(null);
  const listenedSecondsRef = useRef(0);
  const isFinishingRef = useRef(false);

  // Download state
  // { [episodeId]: { status: 'idle'|'downloading'|'done'|'error', progress: 0-100, error?: string } }
  const [downloadState, setDownloadState] = useState({});
  const [offlineEpisodes, setOfflineEpisodes] = useState(new Set());
  const [storageInfo, setStorageInfo] = useState(null);
  const abortControllersRef = useRef({});

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

  // Audio element ref
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";

      audioRef.current.addEventListener("loadedmetadata", () => {
        setDuration(audioRef.current.duration);
        setIsLoading(false);
      });

      audioRef.current.addEventListener("timeupdate", () => {
        const time = audioRef.current.currentTime;
        const dur = audioRef.current.duration;
        setCurrentTime(time);

        // Track listened time (update every 5 seconds)
        if (time - lastUpdateRef.current >= 5) {
          setListenedSeconds((prev) => prev + 5);
          lastUpdateRef.current = time;
        }

        // Auto-mark as finished if very close to end (handles edge cases with playback rate)
        // Give 3 second buffer to account for floating point precision
        if (
          dur > 0 &&
          time >= dur - 3 &&
          !isFinishingRef.current &&
          sessionIdRef.current
        ) {
          console.log(
            "[Podcast] Near end detected (time:",
            time,
            ", duration:",
            dur,
            "), marking as finished",
          );
          isFinishingRef.current = true;
          setIsPlaying(false);
          audioRef.current.pause();

          // Save locally first for offline resilience
          savePositionLocal(currentEpisodeRef.current.id, dur, playbackRate, true).catch(console.error);

          podcastApi
            .endListeningSession(
              sessionIdRef.current,
              listenedSecondsRef.current,
              dur, // Use full duration
              true, // Mark as finished
            )
            .then(() => {
              console.log(
                "[Podcast] Episode marked completed (near-end detection)",
              );
            })
            .catch((e) => {
              console.error("Failed to mark episode finished:", e);
            });

          // Also sync the actual duration to the server if we have a position sync mechanism active
          // This helps fix RSS duration mismatches for all future users
          const localPos = await getLocalPosition(currentEpisodeRef.current.id);
          if (localPos) {
            podcastApi.syncPosition(currentEpisodeRef.current.id, {
              ...localPos,
              duration: Math.round(dur)
            }).catch(e => console.warn("Failed to sync actual duration:", e));
          }
        }
      });

      audioRef.current.addEventListener("ended", async () => {
        console.log("[Podcast] Ended event fired");
        isFinishingRef.current = true;
        setIsPlaying(false);

        // Mark episode as finished when playback completes
        if (currentEpisodeRef.current) {
          try {
            // Ensure we send the full duration as position to avoid "99%" issues
            const finalPosition = audioRef.current?.duration || 0;

            // Save locally first
            savePositionLocal(currentEpisodeRef.current.id, finalPosition, playbackRate, true).catch(console.error);

            if (sessionIdRef.current) {
              await podcastApi.endListeningSession(
                sessionIdRef.current,
                listenedSecondsRef.current,
                finalPosition,
                true,
              );
              console.log("[Podcast] Episode finished, marked completed");
            }

            // Sync final state and actual duration for consistency
            const localPos = await getLocalPosition(currentEpisodeRef.current.id);
            if (localPos) {
              podcastApi.syncPosition(currentEpisodeRef.current.id, {
                ...localPos,
                duration: Math.round(audioRef.current.duration)
              }).catch(e => console.warn("Failed to sync final position/duration:", e));
            }
          } catch (e) {
            console.error("Failed to mark episode finished:", e);
          }
        }
      });

      audioRef.current.addEventListener("error", (e) => {
        // Ignore error when src is empty (cleanup triggers this)
        if (
          !audioRef.current.src ||
          audioRef.current.src === window.location.href
        )
          return;
        console.error("Audio error:", e, audioRef.current.error);
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
              duration: Math.round(audioRef.current.duration)
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

        await savePositionLocal(currentEpisode.id, pos, playbackRate, isFinishing);
        const localPos = await getLocalPosition(currentEpisode.id);
        if (localPos) {
          podcastApi
            .syncPosition(currentEpisode.id, {
              ...localPos,
              duration: Math.round(dur)
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
          listened_seconds: listenedSeconds,
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
  }, [currentEpisode, isPlaying, sessionId, playbackRate, listenedSeconds]);

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

  const cancelDownload = useCallback((episodeId) => {
    const controller = abortControllersRef.current[episodeId];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[episodeId];
      setDownloadState((prev) => {
        const next = { ...prev };
        delete next[episodeId]; // Or set to idle/cancelled
        return next;
      });
      // Just reset to idle so it disappears from active list
      setDownloadState((prev) => ({
        ...prev,
        [episodeId]: { status: "idle", progress: 0 },
      }));
    }
  }, []);

  const startDownload = useCallback(
    async (episode) => {
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
          (received, total) => {
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
          setDownloadState((prev) => ({
            ...prev,
            [episodeId]: { status: "done", progress: 100 },
          }));
          setOfflineEpisodes((prev) => new Set([...prev, episodeId]));
          // Update storage info
          getStorageEstimate().then(setStorageInfo);
          addToast(`Downloaded "${episode.title}"`, "success");
        }
      } catch (e) {
        if (controller.signal.aborted) {
          // Aborted by user - handled by cancelDownload usually, but ensure state is clean
          setDownloadState((prev) => ({
            ...prev,
            [episodeId]: { status: "idle", progress: 0 },
          }));
          return;
        }

        let errorMsg = e.message || "Unknown error";
        // Handle quota exceeded error
        if (e.name === "QuotaExceededError" || errorMsg.includes("quota")) {
          errorMsg = "Storage full. Please free up space.";
        }

        setDownloadState((prev) => ({
          ...prev,
          [episodeId]: { status: "error", progress: 0, error: errorMsg },
        }));
        addToast(`Download failed: ${errorMsg}`, "error");
        console.error("[Download] Failed:", e);
      } finally {
        delete abortControllersRef.current[episodeId];
      }
    },
    [offlineEpisodes, addToast],
  );

  const removeDownload = useCallback(async (episodeId, audioUrl) => {
    const success = await removeOfflineEpisode(episodeId, audioUrl);

    if (success) {
      setOfflineEpisodes((prev) => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });
      setDownloadState((prev) => ({
        ...prev,
        [episodeId]: { status: "idle", progress: 0 },
      }));
      getStorageEstimate().then(setStorageInfo);
    }
    return success;
  }, []);

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
    async (episode, feed, startPosition = null) => {
      if (!episode?.audio_url) return;

      setIsLoading(true);
      isFinishingRef.current = false; // Reset finishing flag

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

      // Get resume position (use provided startPosition or fetch from API)
      let resumePosition = startPosition;
      if (resumePosition === null) {
        try {
          // Use getLatestPosition which checks local and server (with conflict resolution)
          const { position, isFinished } = await getLatestPosition(episode.id);
          // If finished, start from beginning if they click play again
          resumePosition = isFinished ? 0 : (position || 0);
        } catch (e) {
          console.error("Failed to get position:", e);
          resumePosition = 0;
        }
      }

      const audio = audioRef.current;

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
          console.log("[Podcast] Playing from:", audio.currentTime, "at rate:", audio.playbackRate);
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
      const audioSrc = cachedUrl || episode.audio_url;

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
  const seek = useCallback((seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  // Skip forward/backward
  const skip = useCallback((seconds) => {
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
    (rate) => {
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
  }, [sessionId, listenedSeconds]);

  const value = {
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
