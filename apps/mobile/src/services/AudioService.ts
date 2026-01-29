import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
import { usePodcastStore } from "@nce/store";
import type { PodcastEpisode } from "@nce/api";

class AudioService {
  private sound: Audio.Sound | null = null;
  private isLoaded = false;
  private _statusUpdateInterval: NodeJS.Timeout | null = null;

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

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: episode.audio_url },
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
    } catch (error) {
      console.error("Failed to load sound", error);
      store.setBuffering(false);
      store.setIsPlaying(false);
    }
  }

  async pause() {
    if (this.sound && this.isLoaded) {
      await this.sound.pauseAsync();
    }
  }

  async resume() {
    if (this.sound && this.isLoaded) {
      await this.sound.playAsync();
    }
  }

  async seek(millis: number) {
    if (this.sound && this.isLoaded) {
      await this.sound.setPositionAsync(millis);
    }
  }

  async unload() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
      this.isLoaded = false;
    }
  }

  private onPlaybackStatusUpdate = (status: any) => {
    const store = usePodcastStore.getState();

    if (status.isLoaded) {
      store.setProgress(status.positionMillis, status.durationMillis || 1);
      store.setBuffering(status.isBuffering);
      store.setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        store.setIsPlaying(false);
        // Here we could auto-play next logic
      }
    } else if (status.error) {
      console.error(`Player Error: ${status.error}`);
    }
  };
}

export const audioService = new AudioService();
