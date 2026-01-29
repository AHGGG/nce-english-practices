import { useState, useEffect, useRef, useCallback } from "react";
import { authFetch } from "@nce/api";
import EventSource from "react-native-sse";
import { getApiBaseUrl } from "../lib/platform-init";

export interface ExtraContext {
  prevSentence: string | null;
  nextSentence: string | null;
}

export interface InspectorData {
  word: string;
  ldoce: any;
  collins: any;
  found: boolean;
}

/**
 * useWordExplainer for React Native Mobile
 * Uses react-native-sse for real-time streaming
 */
export function useWordExplainer() {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [isPhrase, setIsPhrase] = useState(false);
  const [inspectorData, setInspectorData] = useState<InspectorData | null>(
    null,
  );
  const [isInspecting, setIsInspecting] = useState(false);
  const [currentSentenceContext, setCurrentSentenceContext] = useState("");

  const [extraContext, setExtraContext] = useState<ExtraContext>({
    prevSentence: null,
    nextSentence: null,
  });

  const [contextExplanation, setContextExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainStyle, setExplainStyle] = useState("default");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);

  // Request ID for cancelling stale requests
  const requestIdRef = useRef(0);
  // EventSource instance ref for cleanup
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch dictionary data when lookupWord changes
  useEffect(() => {
    if (!lookupWord) {
      setInspectorData(null);
      setIsInspecting(false);
      return;
    }

    let cancelled = false;
    setIsInspecting(true);

    const fetchBothDictionaries = async (
      word: string,
    ): Promise<InspectorData> => {
      try {
        const [ldoceRes, collinsRes] = await Promise.all([
          authFetch(`/api/dictionary/ldoce/${encodeURIComponent(word)}`),
          authFetch(`/api/dictionary/collins/${encodeURIComponent(word)}`),
        ]);

        const ldoceData = ldoceRes.ok ? await ldoceRes.json() : null;
        const collinsData = collinsRes.ok ? await collinsRes.json() : null;

        return {
          word,
          ldoce: ldoceData,
          collins: collinsData,
          found: !!(ldoceData?.found || collinsData?.found),
        };
      } catch (e) {
        console.error("Dictionary fetch error:", e);
        return { word, ldoce: null, collins: null, found: false };
      }
    };

    const fetchData = async () => {
      try {
        let combinedData = await fetchBothDictionaries(lookupWord);

        // Heuristic Fallback: If not found and it's a phrase, try to find a key word
        if (!combinedData.found && lookupWord.includes(" ")) {
          const stopWords = new Set([
            "of",
            "the",
            "a",
            "an",
            "in",
            "on",
            "at",
            "to",
            "for",
            "with",
            "by",
            "and",
            "or",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "shall",
            "should",
            "can",
            "could",
            "may",
            "might",
            "must",
            "i",
            "you",
            "he",
            "she",
            "it",
            "we",
            "they",
            "me",
            "him",
            "her",
            "us",
            "them",
            "my",
            "your",
            "his",
            "its",
            "our",
            "their",
            "that",
            "this",
            "these",
            "those",
            "there",
            "here",
            "not",
            "no",
            "but",
            "if",
            "so",
            "as",
            "when",
            "where",
            "why",
            "how",
            "up",
            "down",
            "out",
            "back",
            "about",
            "into",
            "over",
            "after",
            "off",
            "away",
            "from",
            "one",
            "two",
            "three",
            "first",
            "second",
            "third",
            "get",
            "got",
            "make",
            "made",
            "go",
            "went",
            "take",
            "took",
            "come",
            "came",
            "see",
            "saw",
            "know",
            "knew",
            "think",
            "thought",
            "look",
            "looked",
            "want",
            "wanted",
            "give",
            "gave",
            "use",
            "used",
            "find",
            "found",
            "tell",
            "told",
            "ask",
            "asked",
            "work",
            "worked",
            "seem",
            "seemed",
            "feel",
            "felt",
            "try",
            "tried",
            "leave",
            "left",
            "call",
            "called",
          ]);

          const tokens = lookupWord
            .split(/[^a-zA-Z0-9-]/)
            .filter((t) => t && t.length > 2);
          const candidates = tokens.filter(
            (t) => !stopWords.has(t.toLowerCase()),
          );

          candidates.sort((a, b) => b.length - a.length);

          if (candidates.length > 0) {
            const fallbackWord = candidates[0];
            const fallbackData = await fetchBothDictionaries(fallbackWord);

            if (fallbackData.found) {
              combinedData = fallbackData;
            }
          }
        }

        if (!cancelled) {
          setInspectorData(combinedData);
        }
      } catch (e) {
        console.error("Dictionary fetch error:", e);
      } finally {
        if (!cancelled) setIsInspecting(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [lookupWord]);

  // Stream context explanation using react-native-sse
  useEffect(() => {
    if (!selectedWord || !currentSentenceContext) return;

    const currentRequestId = ++requestIdRef.current;

    // Cleanup previous EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsExplaining(true);
    setContextExplanation("");
    setImagePrompt(null);

    const url = `${getApiBaseUrl()}/api/sentence-study/explain-word`;

    console.log("[SSE] Creating EventSource for:", url);

    const es = new EventSource(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        text: selectedWord,
        sentence: currentSentenceContext,
        prev_sentence: extraContext.prevSentence,
        next_sentence: extraContext.nextSentence,
        style: explainStyle,
      }),
      pollingInterval: 0, // Disable auto-reconnection
      debug: false,
    });

    eventSourceRef.current = es;

    es.addEventListener("open", () => {
      console.log("[SSE] Connection opened");
    });

    es.addEventListener("message", (event) => {
      if (requestIdRef.current !== currentRequestId) return;

      const data = event.data;
      if (!data) return;

      try {
        const parsed = JSON.parse(data);

        if (parsed.type === "chunk") {
          // Immediately update state for real-time rendering
          setContextExplanation((prev) => prev + parsed.content);
        } else if (parsed.type === "image_check") {
          if (parsed.suitable && parsed.image_prompt) {
            setImagePrompt(parsed.image_prompt);
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener("error", (event) => {
      if (requestIdRef.current !== currentRequestId) return;

      if (event.type === "error") {
        console.error("[SSE] Connection error:", event.message);
      } else if (event.type === "exception") {
        console.error("[SSE] Exception:", event.message);
      }
    });

    es.addEventListener("done", () => {
      console.log("[SSE] Stream done");
      if (requestIdRef.current === currentRequestId) {
        setIsExplaining(false);
      }
    });

    es.addEventListener("close", () => {
      console.log("[SSE] Connection closed");
      if (requestIdRef.current === currentRequestId) {
        setIsExplaining(false);
      }
    });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.removeAllEventListeners();
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [selectedWord, currentSentenceContext, explainStyle, extraContext]);

  // Handle word/phrase click
  const handleWordClick = useCallback((word: string, sentence: string) => {
    if (!word) return;

    const cleanWord = word.toLowerCase().trim();
    if (cleanWord.length < 2) return;

    const hasMultipleWords = cleanWord.includes(" ");

    setIsPhrase(hasMultipleWords);
    setInspectorData(null);
    setCurrentSentenceContext(sentence || "");
    setContextExplanation("");
    setGeneratedImage(null);
    setIsGeneratingImage(false);
    setImagePrompt(null);
    setExplainStyle("default");

    setSelectedWord(cleanWord);
    setLookupWord(cleanWord);
  }, []);

  // Close inspector
  const closeInspector = useCallback(() => {
    // Cleanup EventSource when closing
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setSelectedWord(null);
    setLookupWord(null);
    setInspectorData(null);
    setContextExplanation("");
    setGeneratedImage(null);
    setImagePrompt(null);
    setIsPhrase(false);
  }, []);

  // Change explanation style
  const changeExplainStyle = useCallback((newStyle: string) => {
    setExplainStyle(newStyle);
  }, []);

  // Generate image
  const generateImage = useCallback(async () => {
    if (!imagePrompt || !selectedWord) return;

    setIsGeneratingImage(true);
    try {
      const genRes = await authFetch("/api/generated-images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: selectedWord,
          sentence: currentSentenceContext,
          image_prompt: imagePrompt,
        }),
      });

      if (genRes.ok) {
        const genData = await genRes.json();
        setGeneratedImage(genData.image_url);
      } else {
        console.error("Generate API failed:", genRes.status);
      }
    } catch (e) {
      console.error("Image generation failed", e);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [imagePrompt, selectedWord, currentSentenceContext]);

  return {
    selectedWord,
    isPhrase,
    inspectorData,
    isInspecting,
    currentSentenceContext,
    contextExplanation,
    isExplaining,
    explainStyle,
    generatedImage,
    isGeneratingImage,
    imagePrompt,
    handleWordClick,
    closeInspector,
    changeExplainStyle,
    setCurrentSentenceContext,
    setExtraContext,
    generateImage,
  };
}

export default useWordExplainer;
