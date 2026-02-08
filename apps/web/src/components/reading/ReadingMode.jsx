import React, { useState, useEffect, useRef, useCallback } from "react";
import ReadingTracker from "../../utils/ReadingTracker";
import ArticleListView from "./ArticleListView";
import ReaderView from "./ReaderView";
import WordInspector from "./WordInspector";
import SentenceInspector from "./SentenceInspector";
import Lightbox from "./Lightbox";
import {
  HIGHLIGHT_OPTIONS,
  BATCH_SIZE,
  mapLevelToOptionIndex,
} from "./constants";
import useWordExplainer from "../../hooks/useWordExplainer";
import { useGlobalState } from "../../context/GlobalContext";
import { authFetch } from "../../api/auth";
import { useCollocationLoader } from "@nce/shared";

import { useToast, Dialog, DialogButton } from "../ui";

// Simple API helper for ReadingTracker
const api = {
  post: async (url, data) => {
    const res = await authFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  put: async (url, data) => {
    const res = await authFetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};

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
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Books
  const [books, setBooks] = useState([]);
  const [selectedBookFilename, setSelectedBookFilename] = useState(null);

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
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  // Audio
  const audioRef = useRef(null);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // Reading session tracking
  const trackerRef = useRef(null);

  // Track inspected words for Sweep
  const inspectedWordsRef = useRef(new Set());

  // Calibration banner state
  const [calibrationBanner, setCalibrationBanner] = useState(null);

  // Sentence Inspector state (for unclear sentences)
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [selectedSentenceInfo, setSelectedSentenceInfo] = useState(null);

  // Collocation loader for phrase highlighting
  const { getCollocations, loadCollocations, prefetchCollocations } =
    useCollocationLoader({ prefetchAhead: 5 });

  // Dialog & Toast
  const [confirmAction, setConfirmAction] = useState(null);
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
      const res = await authFetch("/api/reading/epub/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
        if (data.books && data.books.length > 0) {
          // Default to first book if no selection
          // Or could be persistent in localStorage later
          setSelectedBookFilename(data.books[0].filename);
        }
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
      const res = await authFetch("/api/proficiency/calibration/level");
      if (res.ok) {
        const data = await res.json();
        if (data.level !== null && data.level !== undefined) {
          const optionIndex = mapLevelToOptionIndex(data.level);
          setSelectedOptionIndex(optionIndex);
          setCalibrationBanner(
            `Based on your calibration (Level ${data.level}), we suggest: ${HIGHLIGHT_OPTIONS[optionIndex].label}`,
          );
        }
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
  const fetchArticleList = async (filename) => {
    if (!filename) return;
    setIsLoading(true);
    try {
      // Use merged endpoint for better performance (single request instead of two)
      const res = await authFetch(
        `/api/reading/epub/list-with-status?filename=${encodeURIComponent(filename)}`,
      );
      if (res.ok) {
        const data = await res.json();
        const articlesData = data.articles || [];

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
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const loadArticle = async (sourceId, optIndex = null) => {
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

      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        // Vocabulary highlights (COCA, CET-4, etc.)
        data.highlightSet = new Set(
          (data.highlights || []).map((w) => w.toLowerCase()),
        );
        // Study highlights - separate words and phrases for different rendering
        // Words: single words looked up → amber underline
        // Phrases: multi-word phrases → matched via collocation detection → amber background
        data.studyWordSet = new Set();
        data.studyPhraseSet = new Set();
        (data.study_highlights || []).forEach((item) => {
          const lower = item.toLowerCase().trim();
          if (lower.includes(" ")) {
            data.studyPhraseSet.add(lower);
          } else if (lower.length > 1) {
            data.studyWordSet.add(lower);
          }
        });
        // Unclear sentence map (sentence_index -> unclear info)
        data.unclearSentenceMap = {};
        (data.unclear_sentences || []).forEach((info) => {
          data.unclearSentenceMap[info.sentence_index] = info;
        });
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
            sentences: data.sentences?.map((s) => s.text || s) || [],
          },
          api,
        );
        await trackerRef.current.start();
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const playTtsAudio = useCallback((text) => {
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
    (word, sentence) => {
      if (settings.autoPronounce) {
        playTtsAudio(word);
      }
      hookHandleWordClick(word, sentence);
      inspectedWordsRef.current.add(word.toLowerCase());
    },
    [hookHandleWordClick, playTtsAudio, settings.autoPronounce],
  );

  const handleMarkAsKnown = useCallback(
    async (word) => {
      // 1. Optimistic Update - remove from BOTH highlight sets
      const lowerWord = word.toLowerCase();
      if (selectedArticle) {
        setSelectedArticle((prev) => {
          const newHighlightSet = new Set(prev.highlightSet || []);
          newHighlightSet.delete(lowerWord);

          // Also remove from studyHighlightSet (amber highlights from Sentence Study)
          const newStudyHighlightSet = new Set(prev.studyHighlightSet || []);
          newStudyHighlightSet.delete(lowerWord);

          return {
            ...prev,
            highlightSet: newHighlightSet,
            studyHighlightSet: newStudyHighlightSet,
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

  const executeSweep = async (sweptWords, inspected) => {
    // Optimistic clear
    setSelectedArticle((prev) => ({
      ...prev,
      highlightSet: new Set(),
    }));

    try {
      const res = await api.post("/api/proficiency/sweep", {
        swept_words: sweptWords,
        inspected_words: inspected,
      });

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
      addToast("Sweep failed: " + e.message, "error");
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

  const handleImageClick = useCallback((src, alt, caption) => {
    setLightboxImage({ src, alt, caption });
  }, []);

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
          setSelectedSentenceInfo(info);
        }}
        onBackToLibrary={handleBackToLibrary}
        onImageClick={handleImageClick}
        onSweep={handleSweep}
        trackerRef={trackerRef}
        calibrationBanner={calibrationBanner}
        getCollocations={getCollocations}
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
        isOpen={confirmAction?.isOpen}
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
