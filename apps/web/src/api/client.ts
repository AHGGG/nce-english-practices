import { apiGet, apiPost } from "./auth";

// Dictionary
export const lookupDictionary = async (word: string) => {
  return apiPost("/api/dictionary/lookup", { word });
};

export const explainInContext = async (word: string, sentence: string) => {
  return apiPost("/api/dictionary/context", { word, sentence });
};

// Vocabulary
export const getWordContexts = async (word: string) => {
  return apiGet(`/api/vocabulary/contexts?word=${encodeURIComponent(word)}`);
};

export const getDifficultWords = async () => {
  return apiGet("/api/vocabulary/difficult-words");
};

export type UnfamiliarItemType = "all" | "word" | "phrase";
export type UnfamiliarSortType = "recent" | "count" | "difficulty";

export interface UnfamiliarItemContext {
  source_type: string;
  source_id?: string | null;
  context_sentence: string;
  seen_at: string;
}

export interface UnfamiliarItem {
  text: string;
  item_type: "word" | "phrase";
  encounter_count: number;
  last_seen_at?: string | null;
  source_types: string[];
  in_review_queue: boolean;
  next_review_at?: string | null;
  review_repetition: number;
  difficulty_score?: number | null;
  proficiency_status?: string | null;
  exposure_count: number;
  huh_count: number;
  sample_contexts: UnfamiliarItemContext[];
}

export interface UnfamiliarItemsResponse {
  items: UnfamiliarItem[];
  total: number;
  limit: number;
  offset: number;
}

export const getUnfamiliarItems = async (
  type: UnfamiliarItemType = "all",
  sort: UnfamiliarSortType = "recent",
  limit: number = 100,
  offset: number = 0,
  query?: string,
) => {
  const params = new URLSearchParams({
    item_type: type,
    sort,
    limit: String(limit),
    offset: String(offset),
  });
  if (query && query.trim()) {
    params.set("q", query.trim());
  }
  return apiGet(
    `/api/vocabulary/unfamiliar-items?${params.toString()}`,
  ) as Promise<UnfamiliarItemsResponse>;
};
