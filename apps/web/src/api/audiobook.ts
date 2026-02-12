import { apiGet, apiPost } from "./auth";

/**
 * Transcribe an audiobook track.
 * @param {string} bookId - The ID of the audiobook.
 * @param {number} trackIndex - The index of the track to transcribe.
 * @param {boolean} force - Whether to force re-transcription if subtitles exist.
 */
export const transcribeAudiobook = async (
  bookId: string,
  trackIndex = 0,
  force = false,
) => {
  return apiPost(
    `/api/content/audiobook/${bookId}/transcribe?track=${trackIndex}&force=${force}`,
  );
};

/**
 * Get audiobook details.
 * @param {string} bookId - The ID of the audiobook.
 * @param {number} track - The track index.
 */
export const getAudiobook = async (bookId: string, track = 0) => {
  return apiGet(`/api/content/audiobook/${bookId}?track=${track}`);
};

/**
 * List all audiobooks.
 */
export const listAudiobooks = async () => {
  return apiGet("/api/content/audiobook/");
};
