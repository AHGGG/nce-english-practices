import {
  getInfoAsync,
  makeDirectoryAsync,
  deleteAsync,
  createDownloadResumable,
  documentDirectory,
  type DownloadResumable,
  type DownloadProgressData,
} from "expo-file-system/legacy";
import { useDownloadStore } from "@nce/store";
import type { PodcastEpisode } from "@nce/api";

const PODCAST_DIR = documentDirectory + "podcasts/";

class DownloadService {
  private downloadResumables: Record<number, DownloadResumable> = {};

  async init() {
    // Ensure podcast directory exists
    const dirInfo = await getInfoAsync(PODCAST_DIR);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(PODCAST_DIR, { intermediates: true });
    }

    // Handle orphaned active downloads from previous session
    // After app reload, any "downloading" items are now stale (network connection lost)
    // Mark them as "paused" so user can retry
    const store = useDownloadStore.getState();
    const activeDownloads = Object.values(store.activeDownloads);

    for (const item of activeDownloads) {
      if (item.status === "downloading") {
        console.log(
          `[DownloadService] Marking orphaned download as paused: ${item.episode?.title || item.episodeId}`,
        );
        store.updateActiveDownload(item.episodeId, {
          status: "paused",
          error: "Interrupted by app restart",
        });
      }
    }

    if (activeDownloads.length > 0) {
      console.log(
        `[DownloadService] Found ${activeDownloads.length} active downloads from previous session`,
      );
    }
  }

  /**
   * Retry a paused/failed download
   */
  async retryDownload(episodeId: number) {
    const store = useDownloadStore.getState();
    const activeDownload = store.activeDownloads[episodeId];

    if (!activeDownload?.episode) {
      console.error("Cannot retry: no episode data for", episodeId);
      return;
    }

    // Remove old active download and start fresh
    store.removeActiveDownload(episodeId);
    await this.downloadEpisode(activeDownload.episode);
  }

  async downloadEpisode(episode: PodcastEpisode) {
    const store = useDownloadStore.getState();

    if (store.downloads[episode.id] || store.activeDownloads[episode.id]) {
      return;
    }

    const localPath = PODCAST_DIR + `${episode.id}.mp3`;

    // Initialize active download with episode data for display
    store.updateActiveDownload(episode.id, {
      episode,
      status: "downloading",
      progress: 0,
    });

    const callback = (downloadProgress: DownloadProgressData) => {
      const expected = downloadProgress.totalBytesExpectedToWrite;
      if (!expected || expected <= 0) {
        return;
      }

      const progress = downloadProgress.totalBytesWritten / expected;
      store.updateActiveDownload(episode.id, { progress });
    };

    const downloadResumable = createDownloadResumable(
      episode.audio_url,
      localPath,
      {},
      callback,
    );

    this.downloadResumables[episode.id] = downloadResumable;

    try {
      const result = await downloadResumable.downloadAsync();
      if (result) {
        // Complete - get actual file size from filesystem
        let size = 0;
        try {
          const fileInfo = await getInfoAsync(result.uri);
          if (fileInfo.exists && "size" in fileInfo) {
            size = fileInfo.size;
          }
        } catch {
          // Fallback to Content-Length header if available
          if (result.headers && result.headers["Content-Length"]) {
            size = parseInt(result.headers["Content-Length"], 10);
          }
        }

        store.addDownload(episode, result.uri, size);
        store.removeActiveDownload(episode.id);
        delete this.downloadResumables[episode.id];
      }
    } catch (e) {
      console.error("Download failed", e);
      store.updateActiveDownload(episode.id, {
        status: "error",
        error: "Download failed",
      });
      delete this.downloadResumables[episode.id];
    }
  }

  async pauseDownload(episodeId: number) {
    const resumable = this.downloadResumables[episodeId];
    if (resumable) {
      await resumable.pauseAsync();
      useDownloadStore
        .getState()
        .updateActiveDownload(episodeId, { status: "paused" });
    }
  }

  async resumeDownload(episodeId: number) {
    const resumable = this.downloadResumables[episodeId];
    if (resumable) {
      await resumable.resumeAsync();
      useDownloadStore
        .getState()
        .updateActiveDownload(episodeId, { status: "downloading" });
      return;
    }

    await this.retryDownload(episodeId);
  }

  async cancelDownload(episodeId: number) {
    // Cancel the in-flight download if it exists
    const resumable = this.downloadResumables[episodeId];
    if (resumable) {
      try {
        await resumable.pauseAsync();
      } catch {
        // Ignore errors if already stopped
      }
      delete this.downloadResumables[episodeId];
    }

    // Remove from active downloads
    useDownloadStore.getState().removeActiveDownload(episodeId);

    // Try to delete partially downloaded file
    const localPath = PODCAST_DIR + `${episodeId}.mp3`;
    try {
      await deleteAsync(localPath, { idempotent: true });
    } catch {
      // File might not exist
    }
  }

  async deleteDownload(episodeId: number) {
    const store = useDownloadStore.getState();
    const download = store.downloads[episodeId];

    if (download) {
      try {
        await deleteAsync(download.localPath, { idempotent: true });
      } catch (e) {
        console.warn("File delete failed (might be already gone)", e);
      }
      store.removeDownload(episodeId);
    }
  }
}

export const downloadService = new DownloadService();
