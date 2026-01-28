import { useState, useEffect, useCallback, useRef } from "react";
import { authService } from "@nce/api";

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

export interface ReviewSessionOptions {
  limit?: number;
  randomMode?: boolean;
}

export function useReviewSession(options: ReviewSessionOptions = {}) {
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

  // Timer
  const [startTime, setStartTime] = useState(Date.now());

  // Current Item
  const currentItem = queue[currentIndex];

  useEffect(() => {
    if (currentItem) {
      setStartTime(Date.now());
    }
  }, [currentItem]);

  // Load Queue
  const fetchQueue = useCallback(
    async (isRandom = false) => {
      setLoading(true);
      try {
        const endpoint = isRandom ? "/api/review/random" : "/api/review/queue";
        const limit = options.limit || 20;

        const [queueRes, statsRes] = await Promise.all([
          authService.authFetch(`${endpoint}?limit=${limit}`),
          authService.authFetch("/api/review/stats"),
        ]);

        if (!queueRes.ok || !statsRes.ok)
          throw new Error("Failed to load data");

        const queueData = await queueRes.json();
        const statsData = await statsRes.json();

        setQueue(queueData.items || []);
        setStats(statsData);
        setIsRandomMode(isRandom);
        setCurrentIndex(0);
        setLastResult(null);
        setUndoState(null);
      } catch (e) {
        console.error("Failed to load review queue:", e);
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

  // Submit Review
  const submitReview = useCallback(
    async (quality: number) => {
      if (!currentItem || isSubmitting) return;

      setIsSubmitting(true);
      try {
        if (isRandomMode) {
          // Random mode logic (skip backend submit)
          await new Promise((r) => setTimeout(r, 300));
          if (currentIndex < queue.length - 1) {
            setCurrentIndex((p) => p + 1);
          } else {
            setQueue([]); // Finished
          }
          return;
        }

        const duration = Date.now() - startTime;
        const res = await authService.authFetch("/api/review/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: currentItem.id,
            quality,
            duration_ms: duration,
          }),
        });

        if (!res.ok) throw new Error("Submit failed");

        const result = await res.json();
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
        const res = await authService.authFetch("/api/review/undo", {
          method: "POST",
        });
        if (!res.ok) throw new Error("Undo failed");

        const restoredItem = await res.json();
        setQueue((prev) => [restoredItem, ...prev]);
        setCurrentIndex(0);
        setLastResult(null);
        setUndoState((prev) => (prev ? { ...prev, mode: "redo" } : null));

        // Update stats
        setStats((prev) => ({
          ...prev,
          due_items: prev.due_items + 1,
          total_reviews: Math.max(0, prev.total_reviews - 1),
        }));
      } else {
        // Redo
        const res = await authService.authFetch("/api/review/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: undoState.itemId,
            quality: undoState.quality,
            duration_ms: undoState.durationMs,
          }),
        });

        if (!res.ok) throw new Error("Redo failed");

        const result = await res.json();
        setLastResult(result);

        setQueue((prev) => prev.slice(1));
        // Index stays 0
        setUndoState((prev) => (prev ? { ...prev, mode: "undo" } : null));

        // Update stats
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
    fetchQueue,
    submitReview,
    handleUndoRedo,
  };
}
