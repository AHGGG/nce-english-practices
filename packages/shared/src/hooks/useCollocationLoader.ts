import { useCallback, useRef, useState } from "react";
import { sentenceStudyApi } from "@nce/api";

/**
 * Collocation data structure returned by the API
 */
export interface Collocation {
  text: string;
  start_word_idx: number;
  end_word_idx: number;
  key_word?: string;
}

/**
 * Options for useCollocationLoader hook
 */
export interface UseCollocationLoaderOptions {
  /** Number of sentences to prefetch ahead */
  prefetchAhead?: number;
  /** Enable/disable the loader */
  enabled?: boolean;
}

/**
 * Return type for useCollocationLoader hook
 */
export interface UseCollocationLoaderReturn {
  /** Map of sentence hash to collocations */
  collocationsMap: Map<string, Collocation[]>;

  /** Get collocations for a sentence (returns undefined if not loaded) */
  getCollocations: (sentence: string) => Collocation[] | undefined;

  /** Load collocations for specific sentences */
  loadCollocations: (sentences: string[]) => Promise<void>;

  /** Prefetch collocations for upcoming sentences (fire-and-forget) */
  prefetchCollocations: (sentences: string[]) => void;

  /** Check if a sentence's collocations are loaded */
  isLoaded: (sentence: string) => boolean;

  /** Check if currently loading */
  isLoading: boolean;
}

/**
 * Generate a simple hash for a sentence (for caching)
 */
function hashSentence(sentence: string): string {
  // Simple hash: first 50 chars + length
  return `${sentence.slice(0, 50).replace(/\s+/g, "_")}_${sentence.length}`;
}

/**
 * Hook for loading and caching collocations across different pages
 * (Reading, Audiobook, Podcast, etc.)
 *
 * Features:
 * - In-memory caching (frontend)
 * - Backend has 3-layer cache (Memory -> DB -> LLM)
 * - Prefetch support for upcoming content
 * - Viewport/time-driven loading strategies
 *
 * @example
 * ```tsx
 * const { getCollocations, loadCollocations, prefetchCollocations } = useCollocationLoader();
 *
 * // Load collocations for visible sentences
 * useEffect(() => {
 *   loadCollocations(visibleSentences);
 *   prefetchCollocations(upcomingSentences);
 * }, [visibleSentences]);
 *
 * // Use in MemoizedSentence
 * <MemoizedSentence
 *   text={sentence}
 *   collocations={getCollocations(sentence) || []}
 * />
 * ```
 */
export function useCollocationLoader(
  options: UseCollocationLoaderOptions = {},
): UseCollocationLoaderReturn {
  const { prefetchAhead = 5, enabled = true } = options;

  // In-memory cache (persists across re-renders)
  const cacheRef = useRef<Map<string, Collocation[]>>(new Map());

  // Track pending requests to avoid duplicates
  const pendingRef = useRef<Set<string>>(new Set());

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Force re-render when cache updates - this version is used to invalidate getCollocations
  const [version, setVersion] = useState(0);

  /**
   * Get collocations for a sentence from cache
   * Note: depends on `version` to ensure consumers re-render when cache updates
   */
  const getCollocations = useCallback(
    (sentence: string): Collocation[] | undefined => {
      if (!enabled || !sentence) return undefined;
      const hash = hashSentence(sentence);
      return cacheRef.current.get(hash);
    },
    [enabled, version], // version dependency ensures this updates when cache changes
  );

  /**
   * Check if a sentence's collocations are loaded
   */
  const isLoaded = useCallback(
    (sentence: string): boolean => {
      if (!enabled || !sentence) return false;
      const hash = hashSentence(sentence);
      return cacheRef.current.has(hash);
    },
    [enabled],
  );

  /**
   * Load collocations for specific sentences
   * Uses batch API for efficiency (max 10 sentences per request)
   */
  const loadCollocations = useCallback(
    async (sentences: string[]): Promise<void> => {
      if (!enabled || !sentences?.length) return;

      // Filter out already loaded/pending sentences
      const toLoad = sentences.filter((s) => {
        const hash = hashSentence(s);
        return (
          s &&
          s.trim() &&
          !cacheRef.current.has(hash) &&
          !pendingRef.current.has(hash)
        );
      });

      if (!toLoad.length) return;

      setIsLoading(true);

      // Mark as pending
      toLoad.forEach((s) => pendingRef.current.add(hashSentence(s)));

      try {
        // Use batch API for efficiency (handles up to 10 sentences)
        const batchResult =
          await sentenceStudyApi.detectCollocationsBatch(toLoad);

        // Update cache with results
        Object.entries(batchResult.results || {}).forEach(
          ([sentence, collocations]) => {
            const hash = hashSentence(sentence);
            cacheRef.current.set(hash, collocations as Collocation[]);
            pendingRef.current.delete(hash);
          },
        );

        // Mark any missing sentences as empty (in case API didn't return them)
        toLoad.forEach((sentence) => {
          const hash = hashSentence(sentence);
          if (!cacheRef.current.has(hash)) {
            cacheRef.current.set(hash, []);
            pendingRef.current.delete(hash);
          }
        });

        console.log(
          "[useCollocationLoader] Cache updated, triggering re-render. Cache size:",
          cacheRef.current.size,
        );
        // Trigger re-render
        setVersion((v) => v + 1);
      } catch (e) {
        console.error("[useCollocationLoader] Batch load failed:", e);
        // Clear pending on error
        toLoad.forEach((s) => pendingRef.current.delete(hashSentence(s)));
      } finally {
        setIsLoading(false);
      }
    },
    [enabled],
  );

  /**
   * Prefetch collocations for upcoming sentences (fire-and-forget)
   * Uses the backend's prefetch API which runs in background
   */
  const prefetchCollocations = useCallback(
    (sentences: string[]): void => {
      if (!enabled || !sentences?.length) return;

      // Filter out already loaded sentences
      const toFetch = sentences
        .filter((s) => {
          const hash = hashSentence(s);
          return s && s.trim() && !cacheRef.current.has(hash);
        })
        .slice(0, prefetchAhead);

      if (!toFetch.length) return;

      // Fire-and-forget to backend
      sentenceStudyApi.prefetchCollocations(toFetch);
    },
    [enabled, prefetchAhead],
  );

  return {
    collocationsMap: cacheRef.current,
    getCollocations,
    loadCollocations,
    prefetchCollocations,
    isLoaded,
    isLoading,
  };
}
