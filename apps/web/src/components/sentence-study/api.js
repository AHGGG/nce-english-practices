/**
 * Sentence Study API Client
 * Unified API calls for the SentenceStudy module
 */
import { HIGHLIGHT_OPTIONS } from "../reading/constants";
import { authFetch, apiGet, apiPost } from "../../api/auth";

const BASE_URL = "";

export const sentenceStudyApi = {
  async getProgress(sourceId) {
    return apiGet(
      `${BASE_URL}/api/sentence-study/${encodeURIComponent(sourceId)}/progress`,
    );
  },

  async recordLearning(data) {
    return apiPost(`${BASE_URL}/api/sentence-study/record`, data);
  },

  async simplify(data) {
    return apiPost(`${BASE_URL}/api/sentence-study/simplify`, data);
  },

  async getBooks() {
    return apiGet(`${BASE_URL}/api/reading/epub/books`);
  },

  async getArticles(filename) {
    // Use merged endpoint that includes status data (single request instead of two)
    const url = new URL(
      "/api/reading/epub/list-with-status",
      window.location.origin,
    );
    if (filename) {
      url.searchParams.append("filename", filename);
    }
    return apiGet(url.toString());
  },

  async getArticle(sourceId, optionIndex) {
    const opt = HIGHLIGHT_OPTIONS[optionIndex] || HIGHLIGHT_OPTIONS[0];
    const params = new URLSearchParams({
      source_id: sourceId,
      book_code: opt.bookCode || "",
      min_sequence: opt.minSeq || 0,
      max_sequence: opt.maxSeq || 99999,
    });
    return apiGet(`${BASE_URL}/api/reading/article?${params}`);
  },

  async getCalibration() {
    try {
      return await apiGet(`${BASE_URL}/api/proficiency/calibration/level`);
    } catch {
      return null;
    }
  },

  async getOverview(title, fullText, totalSentences) {
    // Return raw response for streaming support
    const res = await authFetch(`${BASE_URL}/api/sentence-study/overview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        full_text: fullText,
        total_sentences: totalSentences,
      }),
    });
    return res;
  },

  async getLastSession() {
    try {
      return await apiGet(`${BASE_URL}/api/sentence-study/last-session`);
    } catch {
      return null;
    }
  },

  // Prefetch collocations for upcoming sentences (fire-and-forget)
  prefetchCollocations(sentences) {
    if (!sentences || sentences.length === 0) return;
    apiPost(`${BASE_URL}/api/sentence-study/prefetch-collocations`, {
      sentences: sentences.slice(0, 5),
    }).catch(() => {}); // Ignore errors, this is best-effort
  },

  // Get all words/phrases looked up during study (for COMPLETED view)
  async getStudyHighlights(sourceId, totalSentences) {
    try {
      return await apiGet(
        `${BASE_URL}/api/sentence-study/${encodeURIComponent(sourceId)}/study-highlights?total_sentences=${totalSentences}`,
      );
    } catch {
      return { word_clicks: [], phrase_clicks: [], is_complete: false };
    }
  },

  // Fetch collocations for a sentence
  async detectCollocations(sentence) {
    try {
      return await apiPost(
        `${BASE_URL}/api/sentence-study/detect-collocations`,
        { sentence },
      );
    } catch {
      return { collocations: [] };
    }
  },

  // Stream word explanation
  async streamExplainWord(data) {
    // Return raw response for streaming
    const res = await authFetch(`${BASE_URL}/api/sentence-study/explain-word`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res;
  },

  // Fetch dictionary entry
  async getDictionary(word) {
    try {
      return await apiGet(
        `${BASE_URL}/api/dictionary/ldoce/${encodeURIComponent(word)}`,
      );
    } catch {
      return null;
    }
  },
};

export default sentenceStudyApi;
