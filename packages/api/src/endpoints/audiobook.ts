import { apiGet, apiPost } from "../auth";

export interface AudiobookTrack {
  index: number;
  title: string;
  start_time?: number;
}

export interface AudiobookLibraryItem {
  id: string;
  title: string;
  author?: string;
  has_subtitles?: boolean;
  track_count?: number;
}

export interface AudiobookBlock {
  type: string;
  text?: string;
  sentences?: string[];
  start_time?: number;
  end_time?: number;
}

export interface AudiobookBundle {
  id: string;
  source_type: string;
  title: string;
  audio_url?: string;
  blocks: AudiobookBlock[];
  metadata?: {
    tracks?: AudiobookTrack[];
    track_count?: number;
    [key: string]: unknown;
  };
}

export const audiobookApi = {
  async list() {
    return apiGet("/api/content/audiobook/") as Promise<AudiobookLibraryItem[]>;
  },

  async getBook(bookId: string, track = 0) {
    return apiGet(
      `/api/content/audiobook/${encodeURIComponent(bookId)}?track=${track}`,
    ) as Promise<AudiobookBundle>;
  },

  async transcribe(bookId: string, track = 0, force = false) {
    return apiPost(
      `/api/content/audiobook/${encodeURIComponent(bookId)}/transcribe?track=${track}`,
      { force },
    );
  },
};
