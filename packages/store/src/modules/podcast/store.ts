import { create } from "zustand";
import type { PodcastPlayerState } from "./types";

export const usePodcastStore = create<PodcastPlayerState>((set) => ({
  // Initial State
  currentEpisode: null,
  isPlaying: false,
  position: 0,
  duration: 1,
  isBuffering: false,
  playbackRate: 1.0,

  // Actions
  setEpisode: (episode) => set({ currentEpisode: episode }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (position, duration) => set({ position, duration }),
  setBuffering: (isBuffering) => set({ isBuffering }),
  setRate: (rate) => set({ playbackRate: rate }),
  reset: () =>
    set({
      currentEpisode: null,
      isPlaying: false,
      position: 0,
      duration: 1,
    }),
}));

// Selectors
export const selectCurrentEpisode = (state: PodcastPlayerState) =>
  state.currentEpisode;
export const selectIsPlaying = (state: PodcastPlayerState) => state.isPlaying;
export const selectProgress = (state: PodcastPlayerState) => ({
  position: state.position,
  duration: state.duration,
  percent: (state.position / state.duration) * 100,
});
