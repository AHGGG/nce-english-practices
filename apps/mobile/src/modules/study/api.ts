import { authService } from "@nce/api";

const BASE_URL = ""; // Relative path for authFetch

export const readingApi = {
  async startSession(data: {
    source_type: string;
    source_id: string;
    article_title: string;
    total_word_count: number;
    total_sentences: number;
  }): Promise<{ success: boolean; session_id?: number; error?: string }> {
    const res = await authService.authFetch(`${BASE_URL}/api/reading/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async sendHeartbeat(data: {
    session_id: number;
    max_sentence_reached: number;
    total_active_seconds: number;
    total_idle_seconds: number;
    scroll_jump_count: number;
  }) {
    return authService.authFetch(`${BASE_URL}/api/reading/heartbeat`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  async endSession(data: {
    session_id: number;
    max_sentence_reached: number;
    total_active_seconds: number;
    total_idle_seconds: number;
    scroll_jump_count: number;
  }) {
    const res = await authService.authFetch(`${BASE_URL}/api/reading/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async recordWordClick(sessionId: number) {
    return authService.authFetch(`${BASE_URL}/api/reading/word-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
  },
};

export const sentenceStudyApi = {
  async recordLearning(data: {
    source_id: string;
    sentence_index: number;
    result: "easy" | "good" | "hard" | "reset";
    study_time_ms: number;
  }) {
    const res = await authService.authFetch(
      `${BASE_URL}/api/sentence-study/record`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    if (!res.ok)
      throw new Error(`Failed to record learning: ${res.statusText}`);
    return res.json();
  },
};
