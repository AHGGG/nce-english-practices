import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import { usePodcastStore, useDownloadStore } from "@nce/store";
import { PodcastEpisode, podcastApi } from "@nce/api";
import { getInfoAsync } from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

class AudioService {
  private sound: Audio.Sound | null = null;
  private isLoaded = false;
  private _statusUpdateInterval: NodeJS.Timeout | null = null;

  // Session Tracking
  private sessionId: number | null = null;
  private listenedSeconds = 0;
  private lastUpdateTimestamp = 0; // For calculating listened time
  private lastApiSyncTimestamp = 0; // For throttling API calls
  private lastLocalSaveTimestamp = 0; // For throttling local storage writes
  private deviceId: string | null = null;

  async init() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.error("AudioService init failed:", e);
    }
  }

  async playEpisode(episode: PodcastEpisode, startPosition = 0) {
    const store = usePodcastStore.getState();

    // If playing same episode, just toggle or ensure playing
    if (store.currentEpisode?.id === episode.id && this.sound) {
      if (!store.isPlaying) {
        await this.sound.playAsync();
      }
      return;
    }

    // Unload existing
    if (this.sound) {
      await this.unload();
    }

    // Update Store
    store.setEpisode(episode);
    store.setBuffering(true);

    // Determine URI (Local vs Network)
    let uri = episode.audio_url;
    const downloadState = useDownloadStore.getState();
    const download = downloadState.downloads[episode.id];

    if (download) {
      const fileInfo = await getInfoAsync(download.localPath);
      if (fileInfo.exists) {
        console.log("Playing from local cache:", download.localPath);
        uri = download.localPath;
      }
    }

    // Guard against null/undefined URI
    if (!uri) {
      console.error("No playback URI available for episode:", episode.id);
      store.setBuffering(false);
      store.setIsPlaying(false);
      return;
    }

    // Reset Session State
    this.sessionId = null;
    this.listenedSeconds = 0;
    this.lastUpdateTimestamp = 0;
    this.lastApiSyncTimestamp = Date.now();

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          positionMillis: startPosition * 1000,
        },
        this.onPlaybackStatusUpdate,
      );

      this.sound = sound;
      this.isLoaded = true;
      store.setIsPlaying(true);
      store.setBuffering(false);

      // Start Session Backend
      try {
        const res = await podcastApi.session.start(episode.id);
        if (res && res.session_id) {
          this.sessionId = res.session_id;
          console.log("[AudioService] Session started:", this.sessionId);
        }
      } catch (e) {
        console.error("[AudioService] Failed to start session:", e);
      }
    } catch (error) {
      console.error("Failed to load sound", error);
      store.setBuffering(false);
      store.setIsPlaying(false);
    }
  }

  async pause() {
    if (this.sound && this.isLoaded) {
      await this.sound.pauseAsync();
      // Sync immediately on pause
      const status = await this.sound.getStatusAsync();
      if (status.isLoaded) {
        this.syncSession(status.positionMillis / 1000);
      }
    }
  }

  async resume() {
    if (this.sound && this.isLoaded) {
      await this.sound.playAsync();
      this.lastUpdateTimestamp = Date.now(); // Reset timestamp to avoid huge delta
    }
  }

  async seek(millis: number) {
    if (this.sound && this.isLoaded) {
      await this.sound.setPositionAsync(millis);
      // Sync after seek? Maybe not strictly necessary, update interval will catch it
    }
  }

  async unload() {
    if (this.sound) {
      // End session if active
      if (this.sessionId) {
        try {
          // Get final status if possible
          const status = await this.sound.getStatusAsync();
          const pos = status.isLoaded ? status.positionMillis / 1000 : 0;
          await this.endSession(pos, false); // Unload = stop = not finished (unless already finished)
        } catch (e) {
          console.warn("Error getting status on unload:", e);
          // Try ending with 0 or last known?
          await this.endSession(0, false);
        }
      }

      await this.sound.unloadAsync();
      this.sound = null;
      this.isLoaded = false;
    }
  }

  async checkpoint() {
    if (this.sound && this.isLoaded && this.sessionId) {
      try {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          await this.syncSession(status.positionMillis / 1000);
        }
      } catch (e) {
        console.warn("[AudioService] Checkpoint failed:", e);
      }
    }
  }

  private async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;
    let id = await AsyncStorage.getItem("device_unique_id");
    if (!id) {
      id =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem("device_unique_id", id);
    }
    this.deviceId = id;
    return id;
  }

  private onPlaybackStatusUpdate = async (status: any) => {
    const store = usePodcastStore.getState();

    if (status.isLoaded) {
      store.setProgress(status.positionMillis, status.durationMillis || 1);
      store.setBuffering(status.isBuffering);
      store.setIsPlaying(status.isPlaying);

      // Track listened time
      if (status.isPlaying) {
        const now = Date.now();
        if (this.lastUpdateTimestamp > 0) {
          const delta = (now - this.lastUpdateTimestamp) / 1000;
          if (delta > 0 && delta < 5) {
            // reasonable delta
            this.listenedSeconds += delta;
          }
        }
        this.lastUpdateTimestamp = now;

        // Periodic Sync (every 10s)
        if (
          this.sessionId &&
          now - this.lastApiSyncTimestamp > 10000 &&
          this.listenedSeconds > 0
        ) {
          this.syncSession(status.positionMillis / 1000);
          this.lastApiSyncTimestamp = now;
        }

        // Local Save (every 1s)
        if (now - this.lastLocalSaveTimestamp > 1000) {
          const currentEpisode = store.currentEpisode;
          if (currentEpisode) {
            // Fire and forget
            AsyncStorage.setItem(
              `podcast_position_${currentEpisode.id}`,
              (status.positionMillis / 1000).toString(),
            ).catch(() => {});
            this.lastLocalSaveTimestamp = now;
          }
        }
      } else {
        this.lastUpdateTimestamp = 0;
      }

      // Mark as finished if very close to end (3-second buffer for playback rate edge cases)
      // This prevents 95% stuck issue when using 1.5x or 2x speed
      const positionSec = status.positionMillis / 1000;
      const durationSec = (status.durationMillis || 1) / 1000;
      const isNearEnd = positionSec >= durationSec - 3;

      if (status.didJustFinish || isNearEnd) {
        store.setIsPlaying(false);
        // End session if not already handled
        if (this.sessionId) {
          await this.endSession(durationSec, true); // Use full duration when finished
        }
        // Here we could auto-play next logic
      }
    } else if (status.error) {
      console.error(`Player Error: ${status.error}`);
    }
  };

  private async syncSession(position: number) {
    if (!this.sessionId) return;
    try {
      const store = usePodcastStore.getState();
      const episodeId = store.currentEpisode?.id;

      if (episodeId) {
        const deviceId = await this.getDeviceId();
        await podcastApi.syncPosition(
          episodeId,
          position,
          deviceId,
          Platform.OS === "ios" ? "ios" : "android",
        );
      } else {
        // Fallback for safety
        await podcastApi.session.update(
          this.sessionId,
          Math.floor(this.listenedSeconds),
          position,
          false, // Not finished yet
        );
      }
    } catch (e) {
      console.warn("[AudioService] Sync failed:", e);
    }
  }

  private async endSession(position: number, isFinished: boolean) {
    if (!this.sessionId) return;
    try {
      await podcastApi.session.end(
        this.sessionId,
        Math.floor(this.listenedSeconds),
        position,
        isFinished,
      );
      this.sessionId = null; // Clear session so we don't update again
      console.log("[AudioService] Session ended, finished:", isFinished);
    } catch (e) {
      console.error("[AudioService] End session failed:", e);
    }
  }
}

export const audioService = new AudioService();
