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
    const dirInfo = await getInfoAsync(PODCAST_DIR);
    if (!dirInfo.exists) {
      await makeDirectoryAsync(PODCAST_DIR, { intermediates: true });
    }
  }

  async downloadEpisode(episode: PodcastEpisode) {
    const store = useDownloadStore.getState();
    const localPath = PODCAST_DIR + `${episode.id}.mp3`;

    // Initialize active download with episode data for display
    store.updateActiveDownload(episode.id, {
      episode,
      status: "downloading",
      progress: 0,
    });

    const callback = (downloadProgress: DownloadProgressData) => {
      const progress =
        downloadProgress.totalBytesWritten /
        downloadProgress.totalBytesExpectedToWrite;
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
        // Complete
        // Try to parse Content-Length, fallback to 0
        let size = 0;
        if (result.headers && result.headers["Content-Length"]) {
          size = parseInt(result.headers["Content-Length"], 10);
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
    }
  }

  async pauseDownload(episodeId: number) {
    const resumable = this.downloadResumables[episodeId];
    if (resumable) {
      await resumable.pauseAsync();
      // For full persistence we would save resumable.savable() to store
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
