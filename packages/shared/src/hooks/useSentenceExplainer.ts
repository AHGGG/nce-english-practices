import { useState, useRef, useEffect, useCallback } from "react";
import { authFetch } from "@nce/api";

export interface ExplanationState {
  [stage: number]: string;
}

export function useSentenceExplainer(
  sentence: string | null,
  type: string = "both",
) {
  const [currentStage, setCurrentStage] = useState(1);
  const [explanations, setExplanations] = useState<ExplanationState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchExplanation = useCallback(
    async (stage: number) => {
      if (!sentence) return;
      if (explanations[stage]) return; // Already cached

      setIsLoading(true);
      setError(null);

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await authFetch("/api/sentence-study/simplify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sentence: sentence,
            simplify_type: type,
            stage: stage,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error("Failed to fetch explanation");
        if (!response.body) throw new Error("No response body");

        // Handle Streaming
        // Note: In React Native, fetch streaming support varies.
        // If using polyfilled fetch or specialized libraries, verify stream support.
        // For standard fetch in RN, it might buffer.
        // However, we are in a shared hook.
        // We assume standard Fetch API behavior or polyfill.

        // NOTE: React Native's Fetch implementation usually DOES NOT support streaming text() or body.getReader() well by default without specific networking libraries or polyfills (like react-native-fetch-api or similar).
        // However, our `authFetch` uses standard `fetch`.
        // If streaming fails in RN, we might fallback to awaiting text().

        // For now, we will try to use a simple text() await if streaming is complex to ensure reliability in RN.
        // But the backend sends SSE-like stream? No, `SentenceInspector` uses `reader.read()`.
        // Let's assume we read the whole text for now to be safe on mobile,
        // OR use a standard loop if possible.

        // Robust Mobile Fallback: Read full text (since simplification is short)
        const text = await response.text();

        // Parse SSE-like format if necessary, OR if the backend sends raw text chunks.
        // The Web code expects "data: { ... }" lines.

        let accumulated = "";
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "chunk") {
                accumulated += data.content;
              }
            } catch (e) {
              // ignore
            }
          }
        }

        setExplanations((prev) => ({ ...prev, [stage]: accumulated }));
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setError(e.message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [sentence, type, explanations],
  );

  // Reset when sentence changes
  useEffect(() => {
    setExplanations({});
    setCurrentStage(1);
    setError(null);
  }, [sentence]);

  return {
    currentStage,
    setCurrentStage,
    explanations,
    isLoading,
    error,
    fetchExplanation,
  };
}
