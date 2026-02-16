import React, { useState, useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";
import ReadingTracker from "../../utils/ReadingTracker";
import ArticleListView from "./ArticleListView";
import ReaderView from "./ReaderView";
import WordInspector from "./WordInspector";
import SentenceInspector from "./SentenceInspector";
import Lightbox from "./Lightbox";
import type { ContentBlock, UnclearSentenceInfo } from "../content/types";
import {
  HIGHLIGHT_OPTIONS,
  BATCH_SIZE,
  mapLevelToOptionIndex,
} from "./constants";
import { useGlobalState } from "../../context/GlobalContext";
import { apiGet, apiPost, apiPut } from "../../api/auth";
import { useCollocationLoader, useWordExplainer } from "@nce/shared";
import { filterCollocationsByLevel } from "../content/shared/collocationDifficulty";

import { useToast, Dialog, DialogButton } from "../ui";

// Simple API helper for ReadingTracker
const api = {
  post: apiPost,
  put: apiPut,
};

interface BookItem {
  filename: string;
  id?: string;
  title: string;
  size_bytes: number;
}

interface ArticleListItem {
  source_id: string;
  id?: string;
  title: string;
  last_read?: string;
  last_studied_at?: string;
}

interface ArticleSentence {
  text: string;
}

interface ReadingArticleData {
  id: string;
  title: string;
  source_type: "epub";
  metadata?: Record<string, unknown> & { filename?: string };
  sentence_count?: number;
  sentences?: Array<string | ArticleSentence>;
  blocks: ContentBlock[];
  highlights?: string[];
  study_highlights?: string[];
  unclear_sentences?: UnclearSentenceInfo[];
  highlightSet?: Set<string>;
  studyWordSet?: Set<string>;
  studyPhraseSet?: Set<string>;
  knownWords?: Set<string>;
  unclearSentenceMap?: Record<number, UnclearSentenceInfo>;
}

interface SweepRecommendation {
  bands?: number[];
}

interface SweepResponse {
  recommendation?: SweepRecommendation;
}

interface ConfirmAction {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
}

interface LightboxImage {
  src: string;
  alt?: string;
  caption?: string;
}

/**
 * Reading Mode - Premium Article Reader
 * Features:
 * - Immersive Reading Environment (Serif, Dark Mode)
 * - Vocabulary Highlighting (COCA, CET-4, etc.)
 * - Rich Word Inspector (Definition, Audio, Context)
 * - Source Awareness (where did I learn this?)
 */
const ReadingMode = () => {
  // --- State ---
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [selectedArticle, setSelectedArticle] =
    useState<ReadingArticleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Books
  const [books, setBooks] = useState<BookItem[]>([]);
  const [selectedBookFilename, setSelectedBookFilename] = useState<
    string | undefined
  >(undefined);

  // Settings
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [showHighlights, setShowHighlights] = useState(true);

  // Word explanation (shared hook)
  const {
    selectedWord,
    isPhrase,
    inspectorData,
    isInspecting,
    contextExplanation,
    isExplaining,
    explainStyle,
    currentSentenceContext,
    handleWordClick: hookHandleWordClick,
    closeInspector,
    changeExplainStyle,
    generatedImage,
    isGeneratingImage,
    imagePrompt,
    generateImage,
  } = useWordExplainer();

  // Progressive loading
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );

  // Reading session tracking
  const trackerRef = useRef<ReadingTracker | null>(null);

  // Track inspected words for Sweep
  const inspectedWordsRef = useRef<Set<string>>(new Set());

  // Calibration banner state
  const [calibrationBanner, setCalibrationBanner] = useState<string | null>(
    null,
  );

  // Sentence Inspector state (for unclear sentences)
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [selectedSentenceInfo, setSelectedSentenceInfo] =
    useState<UnclearSentenceInfo | null>(null);

  // Collocation loader for phrase highlighting
  const { getCollocations, loadCollocations, prefetchCollocations } =
    useCollocationLoader({ prefetchAhead: 5 });

  // Dialog & Toast
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const { addToast } = useToast();
  const {
    state: { settings },
  } = useGlobalState();

  // --- Effects ---

  useEffect(() => {
    // Check URL params for cross-mode navigation
    const urlParams = new URLSearchParams(window.location.search);
    const urlSourceId = urlParams.get("source_id");

    if (urlSourceId) {
      // Direct article load from URL parameter
      console.log("Cross-mode navigation to:", urlSourceId);
      loadArticle(urlSourceId, selectedOptionIndex);
      // Clear URL params to avoid re-triggering on refresh
      window.history.replaceState({}, "", window.location.pathname);
      // Still fetch calibration level in parallel
      fetchCalibrationLevel();
    } else {
      // Parallel fetch for both books and calibration
      Promise.all([fetchBooks(), fetchCalibrationLevel()]);
    }
  }, []);

  // Fetch available books
  const fetchBooks = async () => {
    try {
      const data = await apiGet("/api/reading/epub/books");
      setBooks((data.books || []) as BookItem[]);
      if (data.books && data.books.length > 0) {
        // Default to first book if no selection
        // Or could be persistent in localStorage later
        setSelectedBookFilename(data.books[0].filename);
      }
    } catch (e) {
      console.error("Failed to fetch books:", e);
    }
  };

  // Fetch articles when book changes
  useEffect(() => {
    if (selectedBookFilename) {
      fetchArticleList(selectedBookFilename);
    }
  }, [selectedBookFilename]);

  // Fetch user's calibration level and auto-select highlight option
  const fetchCalibrationLevel = async () => {
    try {
      const data = await apiGet("/api/proficiency/calibration/level");
      if (data.level !== null && data.level !== undefined) {
        const optionIndex = mapLevelToOptionIndex(data.level);
        setSelectedOptionIndex(optionIndex);
        setCalibrationBanner(
          `Based on your calibration (Level ${data.level}), we suggest: ${HIGHLIGHT_OPTIONS[optionIndex].label}`,
        );
      }
    } catch (e) {
      console.error("Failed to fetch calibration level:", e);
    }
  };

  // Re-fetch article if option changes
  useEffect(() => {
    if (selectedArticle && showHighlights) {
      loadArticle(selectedArticle.id, selectedOptionIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOptionIndex]);

  // --- Actions ---
  const fetchArticleList = async (filename: string) => {
    if (!filename) return;
    setIsLoading(true);
    try {
      // Use merged endpoint for better performance (single request instead of two)
      const data = await apiGet(
        `/api/reading/epub/list-with-status?filename=${encodeURIComponent(filename)}`,
      );
      const articlesData = (data.articles || []) as ArticleListItem[];

      setArticles(
        articlesData.sort((a, b) => {
          const timeA = Math.max(
            new Date(a.last_read || 0).getTime(),
            new Date(a.last_studied_at || 0).getTime(),
          );
          const timeB = Math.max(
            new Date(b.last_read || 0).getTime(),
            new Date(b.last_studied_at || 0).getTime(),
          );
          return timeB - timeA;
        }),
      );
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const loadArticle = async (
    sourceId: string,
    optIndex: number | null = null,
  ) => {
    setIsLoading(true);
    try {
      const idx = optIndex !== null ? optIndex : selectedOptionIndex;
      const option = HIGHLIGHT_OPTIONS[idx];

      let url = `/api/reading/article?source_id=${encodeURIComponent(sourceId)}`;

      if (option) {
        url += `&book_code=${option.value}`;
        if (option.range) {
          url += `&min_sequence=${option.range[0]}&max_sequence=${option.range[1]}`;
        }
      }

      const data = (await apiGet(url)) as ReadingArticleData;
      // Vocabulary highlights (COCA, CET-4, etc.)
      data.highlightSet = new Set(
        (data.highlights || []).map((w: string) => w.toLowerCase()),
      );
      // Study highlights - separate words and phrases for different rendering
      // Words: single words looked up → amber underline
      // Phrases: multi-word phrases → matched via collocation detection → amber background
      const studyWordSet = new Set<string>();
      const studyPhraseSet = new Set<string>();
      (data.study_highlights || []).forEach((item: string) => {
        const lower = item.toLowerCase().trim();
        if (lower.includes(" ")) {
          studyPhraseSet.add(lower);
        } else if (lower.length > 1) {
          studyWordSet.add(lower);
        }
      });
      data.studyWordSet = studyWordSet;
      data.studyPhraseSet = studyPhraseSet;
      // Unclear sentence map (sentence_index -> unclear info)
      const unclearSentenceMap: Record<number, UnclearSentenceInfo> = {};
      (data.unclear_sentences || []).forEach((info) => {
        unclearSentenceMap[info.sentence_index] = info;
      });
      data.unclearSentenceMap = unclearSentenceMap;
      setSelectedArticle(data);
      setVisibleCount(BATCH_SIZE);

      // Start reading session tracking
      if (trackerRef.current) {
        await trackerRef.current.end();
      }
      trackerRef.current = new ReadingTracker(
        {
          id: sourceId,
          source_type: "epub",
          title: data.title,
          sentences:
            data.sentences?.map((sentence) =>
              typeof sentence === "string" ? sentence : sentence.text || "",
            ) || [],
        },
        api,
      );
      await trackerRef.current.start();
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const playTtsAudio = useCallback((text: string) => {
    if (!text) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const url = `/api/tts?text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch((e) => console.error(e));
  }, []);

  const handleWordClick = useCallback(
    (word: string, sentence: string) => {
      if (settings.autoPronounce) {
        playTtsAudio(word);
      }
      hookHandleWordClick(word, sentence);
      inspectedWordsRef.current.add(word.toLowerCase());
    },
    [hookHandleWordClick, playTtsAudio, settings.autoPronounce],
  );

  const handleMarkAsKnown = useCallback(
    async (word: string) => {
      // 1. Optimistic Update - remove from BOTH highlight sets
      const lowerWord = word.toLowerCase();
      if (selectedArticle) {
        setSelectedArticle((prev) => {
          if (!prev) return prev;
          const newHighlightSet = new Set(prev.highlightSet || []);
          newHighlightSet.delete(lowerWord);

          // Also remove from study highlight sets (words + phrases)
          const newStudyWordSet = new Set(prev.studyWordSet || []);
          newStudyWordSet.delete(lowerWord);
          const newStudyPhraseSet = new Set(prev.studyPhraseSet || []);
          newStudyPhraseSet.delete(lowerWord);

          return {
            ...prev,
            highlightSet: newHighlightSet,
            studyWordSet: newStudyWordSet,
            studyPhraseSet: newStudyPhraseSet,
          };
        });
      }

      // 2. Close inspector
      closeInspector();

      // 3. API Call
      try {
        await api.put("/api/proficiency/word", {
          word: lowerWord,
          status: "mastered",
        });
        addToast(`Marked "${word}" as known`, "success");
      } catch (e) {
        console.error("Failed to mark as known", e);
        addToast("Failed to sync status to server", "error");
      }
    },
    [selectedArticle, closeInspector, addToast],
  );

  const handleSweep = useCallback(async () => {
    if (!selectedArticle || !selectedArticle.highlightSet) return;

    const allHighlights = Array.from(selectedArticle.highlightSet);
    const inspected = Array.from(inspectedWordsRef.current);
    const sweptWords = allHighlights.filter(
      (w) => !inspectedWordsRef.current.has(w),
    );

    if (sweptWords.length === 0) {
      addToast("No words to sweep!", "info");
      return;
    }

    setConfirmAction({
      isOpen: true,
      title: "Sweep Words",
      message: `Mark ${sweptWords.length} remaining highlighted words as Known?`,
      confirmText: "Sweep",
      onConfirm: async () => {
        setConfirmAction(null);
        await executeSweep(sweptWords, inspected);
      },
    });
  }, [selectedArticle, addToast]); // executeSweep closure handled by defining it inside or via another useCallback

  const executeSweep = async (sweptWords: string[], inspected: string[]) => {
    // Optimistic clear
    setSelectedArticle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        highlightSet: new Set(),
      };
    });

    try {
      const res = (await api.post("/api/proficiency/sweep", {
        swept_words: sweptWords,
        inspected_words: inspected,
      })) as SweepResponse;

      addToast(`Marked ${sweptWords.length} words as known`, "success");

      // Show recommendation if any
      if (res.recommendation) {
        const { bands } = res.recommendation;
        if (bands && bands.length > 0) {
          // Determine range labels
          const ranges = bands.map((b) => `${b}-${b + 1000}`).join(", ");

          setConfirmAction({
            isOpen: true,
            title: "Expert Detected!",
            message: `You swept most words in the ${ranges} frequency bands. Mark ALL words in these bands as Mastered?`,
            confirmText: "Master Bands",
            onConfirm: () => {
              setConfirmAction(null);
              addToast("Global mastery update coming in next phase!", "info");
            },
          });
        }
      }
    } catch (e) {
      console.error("Sweep failed", e);
      const message = e instanceof Error ? e.message : String(e);
      addToast("Sweep failed: " + message, "error");
    }
  };

  const handleBackToLibrary = useCallback(async () => {
    if (trackerRef.current) {
      const result = await trackerRef.current.end();
      console.log("[ReadingMode] Session ended:", result);
      trackerRef.current = null;
    }
    setSelectedArticle(null);
    closeInspector();
  }, []);

  const handleImageClick = useCallback(
    (src: string, alt?: string, caption?: string) => {
      setLightboxImage({ src, alt, caption });
    },
    [],
  );

  // --- Views ---
  if (!selectedArticle) {
    return (
      <ArticleListView
        articles={articles}
        isLoading={isLoading}
        onArticleClick={(sourceId) =>
          loadArticle(sourceId, selectedOptionIndex)
        }
        books={books}
        selectedBookFilename={selectedBookFilename}
        onBookSelect={setSelectedBookFilename}
      />
    );
  }

  return (
    <>
      <ReaderView
        article={selectedArticle}
        visibleCount={visibleCount}
        setVisibleCount={setVisibleCount}
        selectedOptionIndex={selectedOptionIndex}
        setSelectedOptionIndex={setSelectedOptionIndex}
        showHighlights={showHighlights}
        setShowHighlights={setShowHighlights}
        selectedWord={selectedWord}
        onWordClick={handleWordClick}
        onSentenceClick={(sentence, info) => {
          setSelectedSentence(sentence);
          setSelectedSentenceInfo((info || null) as UnclearSentenceInfo | null);
        }}
        onBackToLibrary={handleBackToLibrary}
        onImageClick={handleImageClick}
        onSweep={handleSweep}
        trackerRef={
          trackerRef as unknown as RefObject<
            import("../content/types").ReadingTrackerRef | null
          >
        }
        calibrationBanner={calibrationBanner}
        getCollocations={(sentence) =>
          filterCollocationsByLevel(
            (getCollocations(sentence) || []).map((item) => ({
              reasoning: item.reasoning,
              text: item.text,
              key_word: item.key_word || "",
              start_word_idx: item.start_word_idx,
              end_word_idx: item.end_word_idx,
              difficulty: item.difficulty,
              confidence: item.confidence,
            })),
            settings.collocationDisplayLevel || "core",
          )
        }
        loadCollocations={loadCollocations}
        prefetchCollocations={prefetchCollocations}
      />

      <WordInspector
        selectedWord={selectedWord}
        inspectorData={inspectorData}
        isInspecting={isInspecting}
        onClose={closeInspector}
        onPlayAudio={playTtsAudio}
        onMarkAsKnown={handleMarkAsKnown}
        currentSentenceContext={currentSentenceContext}
        contextExplanation={contextExplanation}
        isExplaining={isExplaining}
        isPhrase={isPhrase}
        onExplainStyle={changeExplainStyle}
        currentStyle={explainStyle}
        generatedImage={generatedImage}
        isGeneratingImage={isGeneratingImage}
        canGenerateImage={!!imagePrompt}
        onGenerateImage={generateImage}
      />

      {lightboxImage && (
        <Lightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          caption={lightboxImage.caption}
          onClose={() => setLightboxImage(null)}
        />
      )}

      <SentenceInspector
        sentence={selectedSentence}
        unclearInfo={selectedSentenceInfo}
        isOpen={!!selectedSentence}
        onClose={() => {
          setSelectedSentence(null);
          setSelectedSentenceInfo(null);
        }}
      />

      <Dialog
        isOpen={Boolean(confirmAction?.isOpen)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title}
        footer={
          <>
            <DialogButton
              variant="ghost"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </DialogButton>
            <DialogButton variant="primary" onClick={confirmAction?.onConfirm}>
              {confirmAction?.confirmText || "Confirm"}
            </DialogButton>
          </>
        }
      >
        <p>{confirmAction?.message}</p>
      </Dialog>
    </>
  );
};

export default ReadingMode;
