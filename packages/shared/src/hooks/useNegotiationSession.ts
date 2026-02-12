import { useState, useRef, useCallback } from "react";
import { apiGet, apiPost } from "@nce/api";

export interface NegotiationState {
  sessionId: string;
  currentText: string;
  isTextVisible: boolean;
  step: "original" | "explain_en" | "explain_cn" | "simplified";
  isLoading: boolean;
  scaffoldUsed: boolean;
  // Scaffolds
  sourceWord: string;
  definition: string;
  translation: string;
  contextScenario: string;
  // Navigation
  historyIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface NegotiationActions {
  start: () => Promise<void>;
  interact: (intention: "huh" | "got_it" | "continue") => Promise<void>;
  toggleText: () => void;
  goBack: () => void;
  goForward: () => void;
  skip: () => Promise<void>;
  speak: (text: string, lang?: string) => Promise<void>; // UI implements this
}

export function useNegotiationSession(
  playAudio: (text: string, lang?: string) => Promise<void>,
) {
  const [state, setState] = useState<NegotiationState>({
    sessionId: `session-${Date.now()}`,
    currentText: "The ubiquity of smartphones has changed how we communicate.",
    isTextVisible: false,
    step: "original",
    isLoading: false,
    scaffoldUsed: false,
    sourceWord: "",
    definition: "",
    translation: "",
    contextScenario: "",
    historyIndex: -1,
    canGoBack: false,
    canGoForward: false,
  });

  const stepHistory = useRef<any[]>([]);
  const voicesRef = useRef<any[]>([]);

  // Fetch content
  const fetchNextContent = useCallback(
    async (excludeWord?: string) => {
      try {
        const url = excludeWord
          ? `/api/negotiation/next-content?exclude=${encodeURIComponent(excludeWord)}`
          : "/api/negotiation/next-content";

        const data = await apiGet(url);
        setState((prev) => ({
          ...prev,
          currentText: data.text,
          sourceWord: data.source_word || "",
          definition: data.definition || "",
          translation: data.translation || "",
          // Reset scaffolds
          step: "original",
          isTextVisible: false,
          scaffoldUsed: false,
          contextScenario: "",
        }));

        // Speak
        await playAudio(data.text);

        // Fetch Context
        if (data.source_word && data.definition) {
          fetchContext(data.source_word, data.definition, data.text);
        }
      } catch (e) {
        console.error(e);
      }
    },
    [playAudio],
  );

  const fetchContext = async (word: string, def: string, sentence: string) => {
    try {
      const data = await apiPost("/api/negotiation/context", {
        word,
        definition: def,
        target_sentence: sentence,
      });
      setState((prev) => ({ ...prev, contextScenario: data.scenario }));
    } catch (e) {
      console.error(e);
    }
  };

  const interact = async (intention: "huh" | "got_it" | "continue") => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const body: any = {
        session_id: state.sessionId,
        user_intention: intention,
      };

      // Context logic (simplified for now)
      if (intention === "huh" && state.step === "original") {
        body.context = {
          target_content: state.currentText,
          source_type: "dictionary",
          definition: state.definition,
          translation_hint: state.translation,
        };
      }

      const data = await apiPost("/api/negotiation/interact", body);

      // Update History
      const currentSnap = { ...state };
      stepHistory.current = [
        ...stepHistory.current.slice(0, state.historyIndex + 1),
        currentSnap,
      ];

      setState((prev) => ({
        ...prev,
        currentText: data.audio_text,
        step: data.next_step,
        historyIndex: prev.historyIndex + 1,
        canGoBack: true,
        isLoading: false,
      }));

      // Speak
      const langHint = data.next_step === "explain_cn" ? "cn" : "en";
      await playAudio(data.audio_text, langHint);

      if (data.next_step === "original") {
        // Reset for new round
        setState((prev) => ({
          ...prev,
          sessionId: `session-${Date.now()}`,
          historyIndex: -1,
          canGoBack: false,
          stepHistory: [],
        }));
        stepHistory.current = [];
        fetchNextContent();
      }
    } catch (e) {
      console.error(e);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const start = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await fetchNextContent();
    setState((prev) => ({ ...prev, isLoading: false }));
  };

  const toggleText = () =>
    setState((prev) => ({
      ...prev,
      isTextVisible: !prev.isTextVisible,
      scaffoldUsed: true,
    }));

  const skip = async () => {
    await fetchNextContent(state.sourceWord);
  };

  return {
    state,
    actions: {
      start,
      interact,
      toggleText,
      skip,
      speak: playAudio, // re-export
      goBack: () => {}, // TODO
      goForward: () => {}, // TODO
    },
  };
}
