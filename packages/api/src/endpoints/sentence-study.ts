/**
 * Sentence Study API Endpoints
 */

import { authFetch } from "../auth";

export interface RecordLearningRequest {
  source_id: string;
  sentence_index: number;
  result: "easy" | "good" | "hard" | "reset";
  study_time_ms: number;
}

/**
 * Sentence Study API client
 */
export const sentenceStudyApi = {
  /**
   * Record sentence learning result
   */
  async recordLearning(data: RecordLearningRequest) {
    const res = await authFetch("/api/sentence-study/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok)
      throw new Error(`Failed to record learning: ${res.statusText}`);
    return res.json();
  },

  /**
   * Get word/phrase explanation with streaming
   * Returns a Response object for SSE parsing
   */
  async explainWord(data: {
    text: string;
    sentence: string;
    prev_sentence?: string | null;
    next_sentence?: string | null;
    style?: string;
  }): Promise<Response> {
    const res = await authFetch("/api/sentence-study/explain-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to get explanation");
    return res;
  },
};
