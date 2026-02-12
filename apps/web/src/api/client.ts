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
