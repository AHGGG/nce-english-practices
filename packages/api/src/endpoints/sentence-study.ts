import { apiGet, apiPost, authFetch } from "../auth";

export const sentenceStudyApi = {
  // Get books for sentence study
  async getBooks() {
    return apiGet("/api/reading/epub/books");
  },

  // Get articles for a book (with status)
  async getArticles(filename?: string) {
    const params = filename ? `?filename=${encodeURIComponent(filename)}` : "";
    return apiGet(`/api/reading/epub/list-with-status${params}`);
  },

  // Get study progress
  async getProgress(sourceId: string) {
    console.log("[sentenceStudyApi.getProgress] Requesting:", sourceId);
    try {
      const data = await apiGet(
        `/api/sentence-study/${encodeURIComponent(sourceId)}/progress`,
      );
      console.log(
        "[sentenceStudyApi.getProgress] Response preview:",
        JSON.stringify(data).substring(0, 200),
      );
      return data;
    } catch (error) {
      console.log("[sentenceStudyApi.getProgress] Error:", error);
      throw error;
    }
  },

  // Record learning result
  async recordLearning(data: any) {
    return apiPost("/api/sentence-study/record", data);
  },

  // Simplify sentence (streaming handled by parser)
  async simplify(data: any) {
    return authFetch("/api/sentence-study/simplify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // Get article overview (streaming handled by parser)
  async getOverview(title: string, fullText: string, totalSentences: number) {
    console.log("[sentenceStudyApi.getOverview] Requesting overview...");
    const res = await authFetch("/api/sentence-study/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        full_text: fullText,
        total_sentences: totalSentences,
      }),
    });
    console.log("[sentenceStudyApi.getOverview] Status:", res.status);
    console.log(
      "[sentenceStudyApi.getOverview] Content-Type:",
      res.headers.get("content-type"),
    );
    return res;
  },

  // Get completed session highlights
  async getStudyHighlights(sourceId: string, totalSentences: number) {
    try {
      return await apiGet(
        `/api/sentence-study/${encodeURIComponent(sourceId)}/study-highlights?total_sentences=${totalSentences}`,
      );
    } catch {
      return { word_clicks: [], phrase_clicks: [], is_complete: false };
    }
  },

  // Detect collocations
  async detectCollocations(sentence: string) {
    try {
      return await apiPost("/api/sentence-study/detect-collocations", {
        sentence,
      });
    } catch {
      return { collocations: [] };
    }
  },

  // Detect collocations for multiple sentences at once (batch)
  async detectCollocationsBatch(
    sentences: string[],
  ): Promise<{ results: Record<string, any[]> }> {
    try {
      return await apiPost("/api/sentence-study/detect-collocations-batch", {
        sentences: sentences.slice(0, 10),
      });
    } catch {
      return { results: {} };
    }
  },

  // Prefetch collocations (fire-and-forget)
  prefetchCollocations(sentences: string[]) {
    if (!sentences?.length) return;
    apiPost("/api/sentence-study/prefetch-collocations", {
      sentences: sentences.slice(0, 5),
    }).catch(() => {});
  },
};
