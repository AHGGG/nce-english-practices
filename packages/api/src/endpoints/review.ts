import { apiGet, apiPost } from "../auth";

export interface ReviewQueueItem {
  id: number;
  source_id: string;
  sentence_index: number;
  sentence_text: string;
  highlighted_items: string[];
  difficulty_type: string;
  interval_days: number;
  repetition: number;
  next_review_at: string;
  created_at: string;
}

export interface ReviewQueueResponse {
  items: ReviewQueueItem[];
  count: number;
}

export interface CreateReviewRequest {
  source_id: string;
  sentence_index: number;
  sentence_text: string;
  highlighted_items?: string[];
  difficulty_type?: string;
}

export interface AddToQueueParams {
  word: string;
  sentence?: string;
  source_id?: string;
  source_type?: string;
}

export const reviewApi = {
  /**
   * Get review items that are due for review
   */
  async getQueue(limit: number = 20): Promise<ReviewQueueResponse> {
    return apiGet(`/api/review/queue?limit=${limit}`);
  },

  /**
   * Add an item to the review queue
   * Note: The backend expects specific fields. This helper adapts the simplified input.
   */
  async addToQueue(params: AddToQueueParams): Promise<any> {
    // Determine source_id and sentence_index
    // If not provided, we might need to fetch them or use placeholders
    // For word-based review, we often create a "vocabulary" item

    // NOTE: The current backend /api/review/create endpoint requires:
    // source_id, sentence_index, sentence_text

    // If we only have a word, we might need a different strategy or a default source
    const source_id = params.source_id || "vocabulary:manual";
    const sentence_text = params.sentence || params.word;

    // We use a dummy index if not provided (e.g. -1 for standalone words)
    const sentence_index = -1;

    const body: CreateReviewRequest = {
      source_id,
      sentence_index,
      sentence_text,
      highlighted_items: [params.word],
      difficulty_type: "vocabulary",
    };

    return apiPost("/api/review/create", body);
  },

  /**
   * Complete a review item
   */
  async completeReview(
    itemId: number,
    quality: number,
    durationMs: number = 0,
  ) {
    return apiPost("/api/review/complete", {
      item_id: itemId,
      quality,
      duration_ms: durationMs,
    });
  },

  /**
   * Undo the last review
   */
  async undoLastReview() {
    return apiPost("/api/review/undo", {});
  },

  /**
   * Get review statistics
   */
  async getStats() {
    return apiGet("/api/review/stats");
  },
};
