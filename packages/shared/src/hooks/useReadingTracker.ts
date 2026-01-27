/**
 * useReadingTracker - Cross-platform reading session tracking
 *
 * This hook tracks reading behavior with mixed signals for accurate
 * input measurement. Works on both Web and React Native.
 *
 * IMPORTANT: You must call setPlatformAdapter() before using this hook.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { readingApi } from "@nce/api";
import { getPlatformAdapter } from "../platform/adapter";

const IDLE_THRESHOLD_MS = 30000; // 30 seconds
const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds

export interface UseReadingTrackerProps {
  articleId: string;
  articleTitle: string;
  sentences: string[];
  sourceType?: string;
}

export interface ReadingTrackerState {
  isActive: boolean;
  activeStartTime: number;
  totalActiveMs: number;
  totalIdleMs: number;
  lastSentenceIdx: number;
  maxSentenceReached: number;
  jumpCount: number;
  wordClickCount: number;
}

export function useReadingTracker({
  articleId,
  articleTitle,
  sentences,
  sourceType = "epub",
}: UseReadingTrackerProps) {
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Refs for mutable state to avoid re-renders
  const stateRef = useRef<ReadingTrackerState>({
    isActive: true,
    activeStartTime: Date.now(),
    totalActiveMs: 0,
    totalIdleMs: 0,
    lastSentenceIdx: 0,
    maxSentenceReached: 0,
    jumpCount: 0,
    wordClickCount: 0,
  });

  const timerRef = useRef<{
    idle: ReturnType<typeof setTimeout> | null;
    heartbeat: ReturnType<typeof setInterval> | null;
  }>({
    idle: null,
    heartbeat: null,
  });

  // Helpers
  const recordActiveTime = useCallback(() => {
    if (stateRef.current.isActive) {
      const now = Date.now();
      stateRef.current.totalActiveMs += now - stateRef.current.activeStartTime;
      stateRef.current.activeStartTime = now;
    }
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (timerRef.current.idle) {
      clearTimeout(timerRef.current.idle);
    }
    timerRef.current.idle = setTimeout(() => {
      recordActiveTime();
      stateRef.current.isActive = false;
      stateRef.current.totalIdleMs += IDLE_THRESHOLD_MS;
    }, IDLE_THRESHOLD_MS);
  }, [recordActiveTime]);

  const onInteraction = useCallback(() => {
    recordActiveTime();
    resetIdleTimer();
  }, [recordActiveTime, resetIdleTimer]);

  // Start Session
  useEffect(() => {
    let mounted = true;

    const start = async () => {
      if (!articleId || sentences.length === 0) return;

      try {
        const totalWords = sentences.reduce(
          (sum, s) => sum + (s.split ? s.split(/\s+/).length : 0),
          0,
        );

        const res = await readingApi.startSession({
          source_type: sourceType,
          source_id: articleId,
          article_title: articleTitle,
          total_word_count: totalWords,
          total_sentences: sentences.length,
        });

        if (res.success && res.session_id && mounted) {
          setSessionId(res.session_id);
          resetIdleTimer();
          console.log("[ReadingTracker] Session started:", res.session_id);
        }
      } catch (e) {
        console.error("[ReadingTracker] Failed to start:", e);
      }
    };

    start();

    return () => {
      mounted = false;
      if (timerRef.current.idle) clearTimeout(timerRef.current.idle);
      if (timerRef.current.heartbeat) clearInterval(timerRef.current.heartbeat);
    };
  }, [articleId, articleTitle, sentences.length, sourceType, resetIdleTimer]);

  // Session ID dependent effects (Heartbeat, Visibility, End)
  useEffect(() => {
    if (!sessionId) return;

    // Heartbeat
    timerRef.current.heartbeat = setInterval(async () => {
      recordActiveTime();
      try {
        await readingApi.sendHeartbeat({
          session_id: sessionId,
          max_sentence_reached: stateRef.current.maxSentenceReached,
          total_active_seconds: Math.round(
            stateRef.current.totalActiveMs / 1000,
          ),
          total_idle_seconds: Math.round(stateRef.current.totalIdleMs / 1000),
          scroll_jump_count: stateRef.current.jumpCount,
        });
      } catch (e) {
        console.error("[ReadingTracker] Heartbeat failed", e);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Platform-specific visibility handling
    const adapter = getPlatformAdapter();
    let cleanupVisibility: (() => void) | undefined;

    if (adapter?.visibility) {
      cleanupVisibility = adapter.visibility.onVisibilityChange((isVisible) => {
        if (isVisible) {
          stateRef.current.isActive = true;
          stateRef.current.activeStartTime = Date.now();
          resetIdleTimer();
        } else {
          recordActiveTime();
          stateRef.current.isActive = false;
          if (timerRef.current.idle) clearTimeout(timerRef.current.idle);
        }
      });
    }

    // Cleanup: end session
    return () => {
      if (cleanupVisibility) cleanupVisibility();
      if (timerRef.current.heartbeat) clearInterval(timerRef.current.heartbeat);

      // End Session on unmount
      recordActiveTime();
      readingApi
        .endSession({
          session_id: sessionId,
          max_sentence_reached: stateRef.current.maxSentenceReached,
          total_active_seconds: Math.round(
            stateRef.current.totalActiveMs / 1000,
          ),
          total_idle_seconds: Math.round(stateRef.current.totalIdleMs / 1000),
          scroll_jump_count: stateRef.current.jumpCount,
        })
        .catch((e) => console.error("[ReadingTracker] End session failed", e));
    };
  }, [sessionId, recordActiveTime, resetIdleTimer]);

  // Methods exposed to UI
  const onSentenceView = useCallback(
    (index: number) => {
      if (index === stateRef.current.lastSentenceIdx) return;

      // Check for jumps (> 5 sentences)
      if (Math.abs(index - stateRef.current.lastSentenceIdx) > 5) {
        stateRef.current.jumpCount++;
      }

      stateRef.current.lastSentenceIdx = index;
      stateRef.current.maxSentenceReached = Math.max(
        stateRef.current.maxSentenceReached,
        index,
      );
      onInteraction();
    },
    [onInteraction],
  );

  const onWordClick = useCallback(() => {
    stateRef.current.wordClickCount++;
    onInteraction();
    if (sessionId) {
      readingApi.recordWordClick(sessionId).catch(() => {});
    }
  }, [sessionId, onInteraction]);

  return {
    sessionId,
    onSentenceView,
    onWordClick,
    onInteraction,
  };
}
