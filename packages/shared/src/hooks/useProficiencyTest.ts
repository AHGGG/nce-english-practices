import { useState, useCallback, useEffect } from "react";
import { proficiencyApi } from "@nce/api";

export interface ProficiencyState {
  step: "intro" | "reading" | "leveling" | "processing" | "complete" | "error";
  sentences: string[];
  currentIndex: number;
  currentLevel: number;
  diagnosis: any | null;
  isLoading: boolean;
}

export interface ProficiencyActions {
  start: () => Promise<void>;
  recordResult: (status: "clear" | "partial" | "confused") => void;
  inspectWord: (word: string) => void; // Tracking
  restart: () => void;
}

export function useProficiencyTest() {
  const [state, setState] = useState<ProficiencyState>({
    step: "intro",
    sentences: [],
    currentIndex: 0,
    currentLevel: 0,
    diagnosis: null,
    isLoading: false,
  });

  const [results, setResults] = useState<any[]>([]);
  const [inspectedWords, setInspectedWords] = useState<Set<string>>(new Set());

  const fetchSession = useCallback(async (level: number) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const data = await proficiencyApi.getSession(level);
      setState((prev) => ({
        ...prev,
        sentences: data.sentences,
        currentIndex: 0,
        currentLevel: level,
        step: "reading",
        isLoading: false,
      }));
    } catch (e) {
      console.error(e);
      setState((prev) => ({ ...prev, step: "error", isLoading: false }));
    }
  }, []);

  const start = useCallback(async () => {
    // Start at level 0 (Beginner)
    await fetchSession(0);
  }, [fetchSession]);

  const inspectWord = useCallback((word: string) => {
    setInspectedWords((prev) => new Set(prev).add(word.toLowerCase()));
  }, []);

  const recordResult = useCallback(
    async (status: "clear" | "partial" | "confused") => {
      // Record result
      const newEntry = {
        sentence_text: state.sentences[state.currentIndex],
        status: status,
        confused_words: Array.from(inspectedWords),
      };

      setInspectedWords(new Set()); // Reset for next
      const newResults = [...results, newEntry];
      setResults(newResults);

      // Check if batch is complete
      if (state.currentIndex < state.sentences.length - 1) {
        setState((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      } else {
        // Batch Complete - Analyze
        const batchStartIndex = newResults.length - state.sentences.length;
        const batchResults = newResults.slice(batchStartIndex);
        let score = 0;
        batchResults.forEach((r) => {
          if (r.status === "clear") score += 1;
          else if (r.status === "partial") score += 0.5;
        });

        // Logic: 3.5+ Up, <1.5 Down (min level 0, max 11)
        if (score >= 3.5 && state.currentLevel < 11) {
          setState((prev) => ({ ...prev, step: "leveling" }));
          setTimeout(() => fetchSession(state.currentLevel + 1), 1500);
        } else if (score < 1.5 && state.currentLevel > 0) {
          setState((prev) => ({ ...prev, step: "leveling" }));
          setTimeout(() => fetchSession(state.currentLevel - 1), 1500);
        } else {
          // Finish
          setState((prev) => ({ ...prev, step: "processing" }));
          try {
            const diagnosis = await proficiencyApi.calibrate(newResults);
            await proficiencyApi.saveLevel(state.currentLevel);
            setState((prev) => ({
              ...prev,
              step: "complete",
              diagnosis,
            }));
          } catch (e) {
            console.error(e);
            setState((prev) => ({ ...prev, step: "error" }));
          }
        }
      }
    },
    [
      state.sentences,
      state.currentIndex,
      state.currentLevel,
      results,
      inspectedWords,
      fetchSession,
    ],
  );

  const restart = () => {
    setResults([]);
    setInspectedWords(new Set());
    setState({
      step: "intro",
      sentences: [],
      currentIndex: 0,
      currentLevel: 0,
      diagnosis: null,
      isLoading: false,
    });
  };

  return {
    state,
    actions: {
      start,
      recordResult,
      inspectWord,
      restart,
    },
  };
}
