import client from "./client";

/**
 * Transcribe an audiobook track.
 * @param {string} bookId - The ID of the audiobook.
 * @param {number} trackIndex - The index of the track to transcribe.
 * @param {boolean} force - Whether to force re-transcription if subtitles exist.
 */
export const transcribeAudiobook = async (
  bookId,
  trackIndex = 0,
  force = false,
) => {
  return client.post(`/api/content/audiobook/${bookId}/transcribe`, null, {
    params: {
      track: trackIndex,
      force,
    },
  });
};

/**
 * Get audiobook details.
 * @param {string} bookId - The ID of the audiobook.
 * @param {number} track - The track index.
 */
export const getAudiobook = async (bookId, track = 0) => {
  return client.get(`/api/content/audiobook/${bookId}`, {
    params: { track },
  });
};

/**
 * List all audiobooks.
 */
export const listAudiobooks = async () => {
  return client.get("/api/content/audiobook/");
};
