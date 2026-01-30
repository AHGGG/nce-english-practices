import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { sentenceStudyApi, readingApi } from "@nce/api";
import { parseJSONSSEStream, parseTextSSEStream } from "../utils/sseParser";
import { useWordExplainer } from "./useWordExplainer";

export interface StudyProgress {
  studied_count: number;
  current_index: number;
  clear_count: number;
  unclear_count: number;
}

export type ViewState =
  | "LOADING"
  | "OVERVIEW"
  | "STUDYING"
  | "COMPLETED"
  | "ERROR";

export function useSentenceStudy(sourceId: string) {
  // State
  const [view, setView] = useState<ViewState>("LOADING");
  const [article, setArticle] = useState<any>(null);
  const [progress, setProgress] = useState<StudyProgress>({
    studied_count: 0,
    current_index: 0,
    clear_count: 0,
    unclear_count: 0,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [overview, setOverview] = useState<any>(null);
  const [overviewStream, setOverviewStream] = useState("");

  // Simplification State
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [simplifiedText, setSimplifiedText] = useState<string | null>(null);
  const [simplifyStage, setSimplifyStage] = useState(1);
  const [simplifyingType, setSimplifyingType] = useState<string | null>(null);

  // Stats Tracking
  const [startTime, setStartTime] = useState(Date.now());
  const [wordClicks, setWordClicks] = useState<string[]>([]);
  const [phraseClicks, setPhraseClicks] = useState<string[]>([]);
  const [studyHighlights, setStudyHighlights] = useState<any>(null);

  // External hooks
  const explainer = useWordExplainer();

  // Helper: Flatten Sentences
  const flatSentences = useMemo(() => {
    if (!article?.blocks) return article?.sentences || [];
    const sentences: any[] = [];
    article.blocks.forEach((block: any) => {
      if (block.type === "paragraph" && block.sentences) {
        block.sentences.forEach((text: string) => sentences.push({ text }));
      }
    });
    return sentences;
  }, [article]);

  const currentSentence = flatSentences[currentIndex];

  // Initialize
  const init = useCallback(async () => {
    setView("LOADING");
    try {
      console.log(
        "[useSentenceStudy] Fetching article and progress for:",
        sourceId,
      );

      let art, prog;

      try {
        art = await readingApi.getArticleDetail(sourceId);
        console.log("[useSentenceStudy] Article loaded:", art?.id);
      } catch (e) {
        console.error("[useSentenceStudy] getArticleDetail failed:", e);
        throw e;
      }

      try {
        prog = await sentenceStudyApi.getProgress(sourceId);
        console.log("[useSentenceStudy] Progress loaded:", prog);
      } catch (e) {
        console.error("[useSentenceStudy] getProgress failed:", e);
        // If progress fails, use default
        prog = {
          studied_count: 0,
          current_index: 0,
          clear_count: 0,
          unclear_count: 0,
        };
      }

      setArticle(art);
      setProgress(prog);

      const total = art.sentence_count || flatSentences.length || 0;

      // Check if completed
      if (prog.current_index >= total && total > 0) {
        const highlights = await sentenceStudyApi.getStudyHighlights(
          sourceId,
          total,
        );
        setStudyHighlights(highlights);
        setView("COMPLETED");
        return;
      }

      setCurrentIndex(prog.current_index || 0);
      setView("OVERVIEW");

      // Start Overview Stream
      const res = await sentenceStudyApi.getOverview(
        art.title,
        art.full_text,
        total,
      );
      if (res.body) {
        // Check if streaming supported
        await parseJSONSSEStream(res, {
          onChunk: (c) => setOverviewStream((p) => p + c),
          onDone: (d) => setOverview(d.overview),
        });
      } else {
        setOverview(await res.json());
      }
    } catch (e) {
      console.error("[useSentenceStudy] Failed to load article:", e);
      setView("ERROR");
    }
  }, [sourceId]);

  // Start Studying
  const startStudying = useCallback(() => {
    setStartTime(Date.now());
    setView("STUDYING");
  }, []);

  // Handlers
  const handleWordClick = useCallback(
    (word: string, sentence?: string) => {
      const clean = word.toLowerCase().trim();
      if (clean.includes(" ")) {
        if (!phraseClicks.includes(clean))
          setPhraseClicks((p) => [...p, clean]);
      } else {
        if (!wordClicks.includes(clean)) setWordClicks((p) => [...p, clean]);
      }
      explainer.handleWordClick(word, sentence || currentSentence?.text);
    },
    [phraseClicks, wordClicks, currentSentence, explainer],
  );

  const advance = useCallback(
    async (result: "clear" | "unclear") => {
      const nextIndex = currentIndex + 1;

      // Update local progress
      setProgress((prev) => ({
        ...prev,
        studied_count: prev.studied_count + 1,
        current_index: nextIndex,
        clear_count:
          result === "clear" ? prev.clear_count + 1 : prev.clear_count,
        unclear_count:
          result === "unclear" ? prev.unclear_count + 1 : prev.unclear_count,
      }));

      if (nextIndex < flatSentences.length) {
        setCurrentIndex(nextIndex);
        // Reset interaction state
        setWordClicks([]);
        setPhraseClicks([]);
        setSimplifiedText(null);
        setSimplifyStage(1);
        setStartTime(Date.now());
      } else {
        // Completed
        const highlights = await sentenceStudyApi.getStudyHighlights(
          sourceId,
          flatSentences.length,
        );
        setStudyHighlights(highlights);
        setView("COMPLETED");
      }
    },
    [currentIndex, flatSentences, sourceId],
  );

  const handleClear = useCallback(async () => {
    const dwellTime = Date.now() - startTime;
    await sentenceStudyApi.recordLearning({
      source_type: "epub",
      source_id: sourceId,
      sentence_index: currentIndex,
      sentence_text: currentSentence?.text,
      initial_response: "clear",
      word_clicks: wordClicks,
      phrase_clicks: phraseClicks,
      dwell_time_ms: dwellTime,
      word_count: currentSentence?.text?.split(" ").length || 0,
    });
    advance("clear");
  }, [
    sourceId,
    currentIndex,
    currentSentence,
    wordClicks,
    phraseClicks,
    startTime,
    advance,
  ]);

  const handleSimplify = useCallback(
    async (type = "meaning", stage = 1) => {
      setIsSimplifying(true);
      setSimplifyingType(type);
      setSimplifyStage(stage);
      setSimplifiedText("");

      try {
        const res = await sentenceStudyApi.simplify({
          sentence: currentSentence?.text,
          simplify_type: type,
          stage,
          // Add context
          prev_sentence:
            currentIndex > 0 ? flatSentences[currentIndex - 1]?.text : null,
          next_sentence:
            currentIndex < flatSentences.length - 1
              ? flatSentences[currentIndex + 1]?.text
              : null,
        });

        await parseJSONSSEStream(res, {
          onChunk: (c) => setSimplifiedText((p) => (p || "") + c),
          onDone: (d) => setSimplifyStage(d.stage),
        });
      } catch (e) {
        console.error(e);
        setSimplifiedText("Failed to simplify.");
      } finally {
        setIsSimplifying(false);
      }
    },
    [currentSentence, currentIndex, flatSentences],
  );

  const handleUnclearResponse = useCallback(
    async (gotIt: boolean) => {
      const dwellTime = Date.now() - startTime;
      await sentenceStudyApi.recordLearning({
        source_type: "epub",
        source_id: sourceId,
        sentence_index: currentIndex,
        sentence_text: currentSentence?.text,
        initial_response: "unclear",
        unclear_choice: simplifyingType || "meaning",
        simplified_response: gotIt ? "got_it" : "still_unclear",
        word_clicks: wordClicks,
        phrase_clicks: phraseClicks,
        dwell_time_ms: dwellTime,
        word_count: currentSentence?.text?.split(" ").length || 0,
        max_simplify_stage: simplifyStage,
      });

      if (gotIt) {
        advance("unclear");
      } else if (simplifyStage < 4) {
        handleSimplify(simplifyingType || "meaning", simplifyStage + 1);
      } else {
        advance("unclear");
      }
    },
    [
      sourceId,
      currentIndex,
      currentSentence,
      simplifyingType,
      simplifyStage,
      wordClicks,
      phraseClicks,
      startTime,
      advance,
      handleSimplify,
    ],
  );

  useEffect(() => {
    init();
  }, [init]);

  return {
    view,
    article,
    overview: overview || { overview: overviewStream }, // Fallback to stream content
    progress,
    currentSentence,
    currentIndex,
    totalSentences: flatSentences.length,
    // Simplification
    isSimplifying,
    simplifiedText,
    simplifyStage,
    // Actions
    startStudying,
    handleWordClick,
    handleClear,
    handleSimplify,
    handleUnclearResponse,
    // Explainer
    explainer,
    // Completed Data
    studyHighlights,
  };
}
