import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "../../lib/storage";
import type { PodcastEpisode } from "@nce/api";

export interface DownloadedEpisode {
  episode: PodcastEpisode;
  localPath: string;
  size: number;
  downloadedAt: number;
}

export interface ActiveDownload {
  episodeId: number;
  episode: PodcastEpisode; // Store full episode data for display
  progress: number; // 0-1
  status: "pending" | "downloading" | "paused" | "error";
  error?: string;
  resumeData?: string; // For FileSystem.createDownloadResumable
}

interface DownloadState {
  downloads: Record<number, DownloadedEpisode>;
  activeDownloads: Record<number, ActiveDownload>;

  // Actions
  addDownload: (
    episode: PodcastEpisode,
    localPath: string,
    size: number,
  ) => void;
  removeDownload: (episodeId: number) => void;
  updateActiveDownload: (
    episodeId: number,
    update: Partial<ActiveDownload>,
  ) => void;
  removeActiveDownload: (episodeId: number) => void;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      downloads: {},
      activeDownloads: {},

      addDownload: (episode, localPath, size) =>
        set((state) => ({
          downloads: {
            ...state.downloads,
            [episode.id]: {
              episode,
              localPath,
              size,
              downloadedAt: Date.now(),
            },
          },
        })),

      removeDownload: (episodeId) =>
        set((state) => {
          const newDownloads = { ...state.downloads };
          delete newDownloads[episodeId];
          return { downloads: newDownloads };
        }),

      updateActiveDownload: (episodeId, update) =>
        set((state) => ({
          activeDownloads: {
            ...state.activeDownloads,
            [episodeId]: {
              ...(state.activeDownloads[episodeId] || {
                episodeId,
                progress: 0,
                status: "pending",
              }),
              ...update,
            },
          },
        })),

      removeActiveDownload: (episodeId) =>
        set((state) => {
          const newActive = { ...state.activeDownloads };
          delete newActive[episodeId];
          return { activeDownloads: newActive };
        }),
    }),
    {
      name: "podcast-downloads",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ downloads: state.downloads }), // Only persist completed downloads
      onRehydrateStorage: () => (state) => {
        console.log(
          "[DownloadStore] Hydrated with",
          state?.downloads ? Object.keys(state.downloads).length : 0,
          "downloads",
        );
      },
    },
  ),
);
