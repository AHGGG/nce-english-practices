/**
 * Dictionary API Endpoints
 *
 * Dictionary lookup functionality.
 */

import { apiGet } from "../auth";

export interface DictionaryEntry {
  word: string;
  found: boolean;
  // Dictionary-specific fields
  [key: string]: any;
}

export interface CombinedDictionaryResult {
  word: string;
  ldoce: DictionaryEntry | null;
  collins: DictionaryEntry | null;
  found: boolean;
}

/**
 * Dictionary API client
 */
export const dictionaryApi = {
  /**
   * Look up word in LDOCE dictionary
   */
  async lookupLdoce(word: string): Promise<DictionaryEntry | null> {
    try {
      return await apiGet(`/api/dictionary/ldoce/${encodeURIComponent(word)}`);
    } catch {
      return null;
    }
  },

  /**
   * Look up word in Collins dictionary
   */
  async lookupCollins(word: string): Promise<DictionaryEntry | null> {
    try {
      return await apiGet(
        `/api/dictionary/collins/${encodeURIComponent(word)}`,
      );
    } catch {
      return null;
    }
  },

  /**
   * Look up word in both dictionaries simultaneously
   */
  async lookupBoth(word: string): Promise<CombinedDictionaryResult> {
    const [ldoce, collins] = await Promise.all([
      this.lookupLdoce(word),
      this.lookupCollins(word),
    ]);

    return {
      word,
      ldoce,
      collins,
      found: !!(ldoce?.found || collins?.found),
    };
  },
};
