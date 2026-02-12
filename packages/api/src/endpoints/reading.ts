/**
 * Reading API Endpoints
 *
 * All reading-related API calls in one place.
 * Used by both Web and Mobile apps.
 */

import { apiGet, apiPost, apiPut } from "../auth";

// Request/Response types
export interface StartSessionRequest {
  source_type: string;
  source_id: string;
  article_title: string;
  total_word_count: number;
  total_sentences: number;
}

export interface StartSessionResponse {
  success: boolean;
  session_id?: number;
  error?: string;
}

export interface HeartbeatRequest {
  session_id: number;
  max_sentence_reached: number;
  total_active_seconds: number;
  total_idle_seconds: number;
  scroll_jump_count: number;
}

export interface EndSessionRequest extends HeartbeatRequest {}

export interface EndSessionResponse {
  success: boolean;
  validated_words?: number;
  [key: string]: any;
}

/**
 * Reading API client
 */
export const readingApi = {
  /**
   * Get list of articles with reading status
   */
  async getArticlesWithStatus(filename?: string) {
    let url = "/api/reading/epub/list-with-status";
    if (filename) {
      url += `?filename=${encodeURIComponent(filename)}`;
    }
    return apiGet(url);
  },

  /**
   * Get single article detail
   */
  async getArticleDetail(id: string) {
    console.log("[readingApi.getArticleDetail] Requesting source_id:", id);
    try {
      const data = await apiGet(
        `/api/reading/article?source_id=${encodeURIComponent(id)}`,
      );
      console.log(
        "[readingApi.getArticleDetail] Response preview:",
        JSON.stringify(data).substring(0, 200),
      );
      return data;
    } catch (error) {
      console.error("[readingApi.getArticleDetail] Error:", error);
      throw error;
    }
  },

  /**
   * Start a new reading session
   */
  async startSession(data: StartSessionRequest): Promise<StartSessionResponse> {
    return apiPost("/api/reading/start", data);
  },

  /**
   * Send heartbeat to update session progress
   */
  async sendHeartbeat(data: HeartbeatRequest): Promise<{ success: boolean }> {
    return apiPut("/api/reading/heartbeat", data);
  },

  /**
   * End reading session
   */
  async endSession(data: EndSessionRequest): Promise<EndSessionResponse> {
    return apiPost("/api/reading/end", data);
  },

  /**
   * Record word click (high-confidence reading signal)
   */
  async recordWordClick(sessionId: number): Promise<{ success: boolean }> {
    return apiPost("/api/reading/word-click", { session_id: sessionId });
  },

  /**
   * Get reading statistics
   */
  async getStats() {
    return apiGet("/api/reading/stats");
  },
};
