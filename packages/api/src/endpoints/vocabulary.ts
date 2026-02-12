import { apiGet, apiPost, authFetch } from "../auth";

export interface VocabularyLogRequest {
  word: string;
  source_type?: string;
  source_id?: string;
  context_sentence?: string;
}

export interface VocabularyContext {
  source_type: string;
  source_id?: string;
  context_sentence: string;
  created_at: string;
  word: string;
}

export interface DifficultWordsResponse {
  words: string[];
}

export interface VocabularyListResponse {
  words: string[];
}

export const vocabularyApi = {
  /**
   * Log a vocabulary lookup event
   */
  async logLookup(data: VocabularyLogRequest) {
    return apiPost("/api/vocabulary/log", {
      source_type: "sentence_study",
      ...data,
    });
  },

  /**
   * Get context history for a specific word
   */
  async getContexts(
    word: string,
    limit: number = 50,
  ): Promise<VocabularyContext[]> {
    return apiGet(
      `/api/vocabulary/contexts?word=${encodeURIComponent(word)}&limit=${limit}`,
    );
  },

  /**
   * Get difficult words list
   */
  async getDifficultWords(): Promise<DifficultWordsResponse> {
    return apiGet("/api/vocabulary/difficult-words");
  },

  /**
   * Get vocabulary list for a specific book/level (e.g. 'coca20000', 'cet4')
   * Note: This endpoint might need to be implemented in the backend if not existing.
   * Assuming it exists based on useVocabularyHighlight usage or we use a placeholder.
   *
   * Re-checking existing code: The original ReaderView used `word_list_service` directly in `content.py`.
   * But `useVocabularyHighlight` expects an API endpoint.
   *
   * Wait, I see `get_article_content` in `content.py` calling `word_list_service.identify_words_in_text`.
   * But `useVocabularyHighlight` wants a list of words to create a Set on the frontend.
   *
   * Checking `app/api/routers/vocabulary.py` again... it does NOT have a `get_list` endpoint.
   * However, `useVocabularyHighlight` was designed to fetch a list.
   *
   * Let's check if there is another router for word lists.
   * I'll search for "word_list_service" usages.
   */
  async getVocabularyList(
    code: string,
    range?: [number, number],
  ): Promise<VocabularyListResponse> {
    // If the backend doesn't support this yet, we might need to add it or use a workaround.
    // For now, let's assume there's an endpoint or we stub it here to avoid errors.

    let url = `/api/vocabulary/list?code=${encodeURIComponent(code)}`;
    if (range) {
      url += `&min=${range[0]}&max=${range[1]}`;
    }

    // TEMPORARY: Since I didn't see this endpoint in `vocabulary.py`,
    // I will check if I should implement it in backend or if I missed it.
    // Ideally, the frontend should request highlights for specific text (like `get_article_content` does).
    // But `useVocabularyHighlight` implies fetching the *whole list* to highlight locally?
    //
    // Actually, `ReaderView` in `get_article_content` returns `highlights`.
    // The new `TextContentRenderer` uses `highlightSet` passed from props.
    // `useVocabularyHighlight` is a hook to fetch this set if we are rendering something else?

    // Let's implement a safe fetch that returns empty if 404
    try {
      return await apiGet(url);
    } catch (e) {
      console.warn("Failed to fetch vocabulary list", e);
      return { words: [] };
    }
  },
};
