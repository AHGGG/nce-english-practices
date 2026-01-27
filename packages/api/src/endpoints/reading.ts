/**
 * Reading API Endpoints
 *
 * All reading-related API calls in one place.
 * Used by both Web and Mobile apps.
 */

import { authFetch } from "../auth";

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
  async getArticlesWithStatus() {
    const res = await authFetch("/api/reading/epub/list-with-status");
    if (!res.ok) throw new Error("Failed to fetch articles");
    return res.json();
  },

  /**
   * Get single article detail
   */
  async getArticleDetail(id: string) {
    const res = await authFetch(
      `/api/reading/article?id=${encodeURIComponent(id)}`,
    );
    if (!res.ok) throw new Error("Failed to fetch article");
    return res.json();
  },

  /**
   * Start a new reading session
   */
  async startSession(data: StartSessionRequest): Promise<StartSessionResponse> {
    const res = await authFetch("/api/reading/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * Send heartbeat to update session progress
   */
  async sendHeartbeat(data: HeartbeatRequest): Promise<{ success: boolean }> {
    const res = await authFetch("/api/reading/heartbeat", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * End reading session
   */
  async endSession(data: EndSessionRequest): Promise<EndSessionResponse> {
    const res = await authFetch("/api/reading/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  /**
   * Record word click (high-confidence reading signal)
   */
  async recordWordClick(sessionId: number): Promise<{ success: boolean }> {
    const res = await authFetch("/api/reading/word-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    return res.json();
  },

  /**
   * Get reading statistics
   */
  async getStats() {
    const res = await authFetch("/api/reading/stats");
    if (!res.ok) throw new Error("Failed to fetch reading stats");
    return res.json();
  },
};
