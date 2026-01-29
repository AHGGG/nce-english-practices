import { authFetch } from "../auth";

export const sentenceStudyApi = {
  // Get books for sentence study
  async getBooks() {
    const res = await authFetch("/api/reading/epub/books");
    if (!res.ok) throw new Error("Failed to get books");
    return res.json();
  },

  // Get articles for a book (with status)
  async getArticles(filename?: string) {
    const params = filename ? `?filename=${encodeURIComponent(filename)}` : "";
    const res = await authFetch(`/api/reading/epub/list-with-status${params}`);
    if (!res.ok) throw new Error("Failed to get articles");
    return res.json();
  },

  // Get study progress
  async getProgress(sourceId: string) {
    const res = await authFetch(
      `/api/sentence-study/${encodeURIComponent(sourceId)}/progress`,
    );
    if (!res.ok) throw new Error("Failed to get progress");
    return res.json();
  },

  // Record learning result
  async recordLearning(data: any) {
    const res = await authFetch("/api/sentence-study/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to record learning");
    return res.json();
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
    return authFetch("/api/sentence-study/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        full_text: fullText,
        total_sentences: totalSentences,
      }),
    });
  },

  // Get completed session highlights
  async getStudyHighlights(sourceId: string, totalSentences: number) {
    const res = await authFetch(
      `/api/sentence-study/${encodeURIComponent(sourceId)}/study-highlights?total_sentences=${totalSentences}`,
    );
    if (!res.ok)
      return { word_clicks: [], phrase_clicks: [], is_complete: false };
    return res.json();
  },

  // Detect collocations
  async detectCollocations(sentence: string) {
    const res = await authFetch("/api/sentence-study/detect-collocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence }),
    });
    if (!res.ok) return { collocations: [] };
    return res.json();
  },

  // Prefetch collocations (fire-and-forget)
  prefetchCollocations(sentences: string[]) {
    if (!sentences?.length) return;
    authFetch("/api/sentence-study/prefetch-collocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentences: sentences.slice(0, 5) }),
    }).catch(() => {});
  },
};
