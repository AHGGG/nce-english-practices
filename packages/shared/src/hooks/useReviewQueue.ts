import { useState, useEffect, useCallback, useRef } from "react";
import { authService, apiGet, apiPost } from "@nce/api";
import { parseJSONSSEStream, parseTextSSEStream } from "../utils/sseParser";

export interface ReviewItem {
  id: number;
  sentence_text: string;
  highlighted_items: string[];
  source_id: string;
  difficulty_type: string;
  repetition: number;
  interval_days: number;
  review_log_id?: number; // For undo
}

export interface ReviewStats {
  total_items: number;
  due_items: number;
  total_reviews: number;
}

export interface ReviewQueueOptions {
  limit?: number;
  randomMode?: boolean;
}

export interface ContextData {
  previous_sentence?: string;
  target_sentence: string;
  next_sentence?: string;
}

export function useReviewQueue(options: ReviewQueueOptions = {}) {
  // Queue State
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total_items: 0,
    due_items: 0,
    total_reviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(!!options.randomMode);
  const [lastResult, setLastResult] = useState<any>(null);

  // Undo State
  const [undoState, setUndoState] = useState<{
    mode: "undo" | "redo";
    itemId: number;
    quality: number;
    durationMs: number;
  } | null>(null);

  // Context State
  const [contextData, setContextData] = useState<ContextData | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);

  // Help/Explanation State
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [helpStage, setHelpStage] = useState(1);
  const [helpContent, setHelpContent] = useState("");
  const [isLoadingHelp, setIsLoadingHelp] = useState(false);
  const helpRequestIdRef = useRef(0);

  // Timer
  const [startTime, setStartTime] = useState(Date.now());

  // Current Item
  const currentItem = queue[currentIndex];

  useEffect(() => {
    if (currentItem) {
      setStartTime(Date.now());
      // Reset Item-specific state
      setContextData(null);
      setShowContext(false);
      setShowHelpPanel(false);
      setHelpStage(1);
      setHelpContent("");
    }
  }, [currentItem]);

  // Load Queue
  const fetchQueue = useCallback(
    async (isRandom = false) => {
      setLoading(true);
      try {
        const endpoint = isRandom ? "/api/review/random" : "/api/review/queue";
        const limit = options.limit || 20;

        const [queueData, statsData] = await Promise.all([
          apiGet(`${endpoint}?limit=${limit}`),
          apiGet("/api/review/stats"),
        ]);

        setQueue(queueData.items || []);
        setStats(statsData);
        setCurrentIndex(0);
        setIsRandomMode(isRandom);
        setLastResult(null);
        setUndoState(null);
      } catch (e) {
        console.error("Failed to load queue:", e);
      } finally {
        setLoading(false);
      }
    },
    [options.limit],
  );

  // Initial Load
  useEffect(() => {
    fetchQueue(options.randomMode);
  }, []);

  const refreshQueue = useCallback(() => fetchQueue(false), [fetchQueue]);
  const startRandomReview = useCallback(() => fetchQueue(true), [fetchQueue]);

  // Submit Review
  const handleRating = useCallback(
    async (quality: number) => {
      if (!currentItem || isSubmitting) return;

      setIsSubmitting(true);
      try {
        if (isRandomMode) {
          // Random mode logic
          await new Promise((r) => setTimeout(r, 300));
          if (currentIndex < queue.length - 1) {
            setCurrentIndex((p) => p + 1);
          } else {
            setQueue([]); // Finished
          }
          return;
        }

        const duration = Date.now() - startTime;
        const result = await apiPost("/api/review/complete", {
          item_id: currentItem.id,
          quality,
          duration_ms: duration,
        });

        setLastResult(result);

        // Save undo state
        setUndoState({
          mode: "undo",
          itemId: currentItem.id,
          quality,
          durationMs: duration,
        });

        // Move next
        if (currentIndex < queue.length - 1) {
          setCurrentIndex((p) => p + 1);
        } else {
          // Finished batch, reload
          await fetchQueue(false);
        }
      } catch (e) {
        console.error("Submit error:", e);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      currentItem,
      currentIndex,
      queue.length,
      isSubmitting,
      isRandomMode,
      startTime,
      fetchQueue,
    ],
  );

  // Undo/Redo
  const handleUndoRedo = useCallback(async () => {
    if (!undoState || isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (undoState.mode === "undo") {
        const restoredItem = await apiPost("/api/review/undo", {});
        setQueue((prev) => [restoredItem, ...prev]);
        setCurrentIndex(0);
        setLastResult(null);
        setUndoState((prev) => (prev ? { ...prev, mode: "redo" } : null));

        setStats((prev) => ({
          ...prev,
          due_items: prev.due_items + 1,
          total_reviews: Math.max(0, prev.total_reviews - 1),
        }));
      } else {
        const result = await apiPost("/api/review/complete", {
          item_id: undoState.itemId,
          quality: undoState.quality,
          duration_ms: undoState.durationMs,
        });

        setLastResult(result);

        setQueue((prev) => prev.slice(1));
        setUndoState((prev) => (prev ? { ...prev, mode: "undo" } : null));

        setStats((prev) => ({
          ...prev,
          due_items: Math.max(0, prev.due_items - 1),
          total_reviews: prev.total_reviews + 1,
        }));
      }
    } catch (e) {
      console.error("Undo/Redo error", e);
    } finally {
      setIsSubmitting(false);
    }
  }, [undoState, isSubmitting]);

  // Context Logic
  const toggleContext = useCallback(async () => {
    if (showContext) {
      setShowContext(false);
      return;
    }
    if (contextData) {
      setShowContext(true);
      return;
    }
    if (!currentItem) return;

    setLoadingContext(true);
    try {
      const data = await apiGet(`/api/review/context/${currentItem.id}`);
      setContextData(data);
      setShowContext(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContext(false);
    }
  }, [showContext, contextData, currentItem]);

  // Explanation Logic
  const streamExplanation = useCallback(
    async (stage: number) => {
      if (!currentItem) return;

      const currentRequestId = ++helpRequestIdRef.current;
      setIsLoadingHelp(true);
      setHelpContent("");
      setHelpStage(stage);

      const hasHighlights =
        currentItem.highlighted_items &&
        currentItem.highlighted_items.length > 0;

      try {
        let res: Response;
        if (hasHighlights) {
          const text = currentItem.highlighted_items.join(", ");
          res = await authService.authFetch(
            "/api/sentence-study/explain-word",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text,
                sentence: currentItem.sentence_text,
                style:
                  stage === 1
                    ? "brief"
                    : stage === 2
                      ? "default"
                      : stage === 3
                        ? "simple"
                        : "chinese_deep",
              }),
            },
          );
        } else {
          res = await authService.authFetch("/api/sentence-study/simplify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sentence: currentItem.sentence_text,
              simplify_type: "meaning",
              stage,
            }),
          });
        }

        if (helpRequestIdRef.current !== currentRequestId) return;
        if (!res.ok) throw new Error("Failed to fetch explanation");

        // Use appropriate parser based on endpoint
        if (hasHighlights) {
          await parseTextSSEStream(
            res,
            {
              onText: (text) => {
                if (helpRequestIdRef.current === currentRequestId) {
                  setHelpContent((prev) => prev + text);
                }
              },
              onError: (err) => console.error(err),
            },
            {
              abortCheck: () => helpRequestIdRef.current !== currentRequestId,
            },
          );
        } else {
          await parseJSONSSEStream(res, {
            onChunk: (content) => {
              if (helpRequestIdRef.current === currentRequestId) {
                setHelpContent((prev) => prev + content);
              }
            },
            onError: (err) => console.error(err),
          });
        }
      } catch (e) {
        console.error("Stream explanation error:", e);
        if (helpRequestIdRef.current === currentRequestId) {
          setHelpContent("Loading failed. Please try again.");
        }
      } finally {
        if (helpRequestIdRef.current === currentRequestId) {
          setIsLoadingHelp(false);
        }
      }
    },
    [currentItem],
  );

  const handleForgot = useCallback(() => {
    setShowHelpPanel(true);
    streamExplanation(1);
  }, [streamExplanation]);

  const handleHelpResponse = useCallback(
    async (remembered: boolean) => {
      if (remembered) {
        await handleRating(2); // Hard/Remembered
      } else if (helpStage < 4) {
        streamExplanation(helpStage + 1);
      } else {
        await handleRating(1); // Forgot
      }
    },
    [helpStage, handleRating, streamExplanation],
  );

  const handleSkipHelp = useCallback(async () => {
    await handleRating(1);
  }, [handleRating]);

  return {
    queue,
    stats,
    loading,
    currentItem,
    currentIndex,
    isSubmitting,
    isRandomMode,
    lastResult,
    undoState,
    refreshQueue,
    startRandomReview,
    handleRating,
    handleUndoRedo,
    // Context
    showContext,
    contextData,
    loadingContext,
    toggleContext,
    // Help
    showHelpPanel,
    helpContent,
    helpStage,
    isLoadingHelp,
    handleForgot,
    handleHelpResponse,
    handleSkipHelp,
  };
}
