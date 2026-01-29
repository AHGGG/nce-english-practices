import type { PodcastEpisode } from "@nce/api";

export interface PodcastPlayerState {
  // State
  currentEpisode: PodcastEpisode | null;
  isPlaying: boolean;
  position: number; // millis
  duration: number; // millis
  isBuffering: boolean;
  playbackRate: number;

  // Actions
  setEpisode: (episode: PodcastEpisode) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setProgress: (position: number, duration: number) => void;
  setBuffering: (isBuffering: boolean) => void;
  setRate: (rate: number) => void;
  reset: () => void;
}
