/**
 * SentenceStudy - Adaptive Sentence Learning Mode (ASL)
 *
 * Refactored: Orchestrates view components and manages shared state.
 * Views are in ./views/, API calls in ./api.js, constants in ./constants.js
 */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";

// Local imports
import sentenceStudyApi from "./api";
import { getDifficultWords } from "../../api/client";
import {
  VIEW_STATES,
  DIFFICULTY_CHOICES,
  extractSentencesFromBlocks,
} from "./constants";
import { HIGHLIGHT_OPTIONS, mapLevelToOptionIndex } from "../reading/constants";
import WordInspector from "../reading/WordInspector";
import { useWordExplainer } from "@nce/shared";
import { useGlobalState } from "../../context/GlobalContext";
import { parseJSONSSEStream, isSSEResponse } from "../../utils/sseParser";
import { useToast } from "../../components/ui/Toast";

import { apiPut } from "../../api/auth";

// View components
import {
  BookShelfView,
  ArticleListView,
  OverviewView,
  StudyingView,
  CompletedView,
} from "./views";

const SentenceStudy = () => {
  const navigate = useNavigate();

  // View state
  const [view, setView] = useState(VIEW_STATES.BOOK_SHELF);
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Article & sentence state
  const [currentArticle, setCurrentArticle] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState({
    studied_count: 0,
    clear_count: 0,
    unclear_count: 0,
  });

  // Interaction state
  const [wordClicks, setWordClicks] = useState([]);
  const [phraseClicks, setPhraseClicks] = useState([]);
  const [startTime, setStartTime] = useState(null);
  // showDiagnose is removed in favor of 4-stage flow
  const [simplifiedText, setSimplifiedText] = useState(null);
  const [simplifyingType, setSimplifyingType] = useState(null);
  const [simplifyStage, setSimplifyStage] = useState(1);
  const [isSimplifying, setIsSimplifying] = useState(false);

  // Overview state
  const [overview, setOverview] = useState(null);

  const [overviewStreamContent, setOverviewStreamContent] = useState("");

  // Global difficult words (for highlighting)
  const [globalDifficultWords, setGlobalDifficultWords] = useState(new Set());
  // Session known words (to explicitly remove highlights even if in calibration set)
  const [sessionKnownWords, setSessionKnownWords] = useState(new Set());

  // Study highlights state (for COMPLETED view)
  const [studyHighlights, setStudyHighlights] = useState({
    word_clicks: [],
    phrase_clicks: [],
  });

  const {
    selectedWord,
    isPhrase,
    inspectorData,
    isInspecting,
    contextExplanation,
    isExplaining,
    explainStyle,
    generatedImage,
    isGeneratingImage,
    imagePrompt,
    generateImage,
    handleWordClick: baseHandleWordClick,
    closeInspector,
    changeExplainStyle,
    setExtraContext,
  } = useWordExplainer();

  // Collocations
  const [collocations, setCollocations] = useState([]);

  const {
    state: { settings },
  } = useGlobalState();

  const { addToast } = useToast();

  // Refs
  const audioRef = useRef(null);

  const sentenceContainerRef = useRef(null);

  // Highlight settings
  const [highlightOptionIndex, setHighlightOptionIndex] = useState(0);

  // Compute flat sentence list from blocks
  const flatSentences = useMemo(() => {
    if (!currentArticle?.blocks?.length) return [];
    return extractSentencesFromBlocks(currentArticle.blocks);
  }, [currentArticle]);

  // === Helper: Sort articles by recent activity (status already in API response) ===
  const sortArticlesByActivity = (articlesList) => {
    return [...articlesList].sort((a, b) => {
      const timeA = Math.max(
        new Date(a.last_read || 0).getTime(),
        new Date(a.last_studied_at || 0).getTime(),
      );
      const timeB = Math.max(
        new Date(b.last_read || 0).getTime(),
        new Date(b.last_studied_at || 0).getTime(),
      );
      return timeB - timeA;
    });
  };

  // === Book Selection ===
  const selectBook = async (bookFilename) => {
    setLoading(true);
    // Find full book object from filename
    const book = books.find((b) => b.filename === bookFilename);
    if (!book) return;

    setSelectedBook(book);
    try {
      const data = await sentenceStudyApi.getArticles(book.filename);
      const articlesList = (data.articles || []).filter(
        (a) => a.sentence_count > 0,
      );
      const sorted = sortArticlesByActivity(articlesList);
      setArticles(sorted);
      setView(VIEW_STATES.ARTICLE_LIST);
    } catch (e) {
      console.error("Failed to load articles for book:", e);
    } finally {
      setLoading(false);
    }
  };

  // === Initial Load ===
  useEffect(() => {
    const load = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlSourceId = urlParams.get("source_id");
        const urlSentence = urlParams.get("sentence");

        // Fetch global difficult words in parallel
        getDifficultWords()
          .then((data) => {
            if (data && data.words) {
              setGlobalDifficultWords(new Set(data.words));
            }
          })
          .catch((e) => console.error("Failed to load difficult words:", e));

        const [booksData, calibrationData, lastSession] = await Promise.all([
          sentenceStudyApi.getBooks(),
          sentenceStudyApi.getCalibration(),
          sentenceStudyApi.getLastSession(),
        ]);

        setBooks(booksData.books || []);

        // Auto-select first book if available and no URL params
        if (!urlSourceId && booksData.books && booksData.books.length > 0) {
          // We need to call selectBook, but we're inside useEffect.
          // We can set selectedBook directly and load articles, OR just call selectBook logic.
          const defaultBook = booksData.books[0];
          setSelectedBook(defaultBook);
          // Load articles for default book immediately
          const articlesData = await sentenceStudyApi.getArticles(
            defaultBook.filename,
          );
          const filtered = (articlesData.articles || []).filter(
            (a) => a.sentence_count > 0,
          );
          const sorted = sortArticlesByActivity(filtered);
          setArticles(sorted);
          setView(VIEW_STATES.ARTICLE_LIST);
        }

        if (calibrationData?.level !== undefined) {
          setHighlightOptionIndex(mapLevelToOptionIndex(calibrationData.level));
        }

        // URL parameter navigation
        if (urlSourceId && urlSourceId.startsWith("epub:")) {
          const parts = urlSourceId.split(":");
          if (parts.length >= 3) {
            const filename = parts[1];
            const book = (booksData.books || []).find(
              (b) => b.filename === filename,
            );
            setSelectedBook(book || { filename, title: filename });

            const articlesData = await sentenceStudyApi.getArticles(filename);
            const filtered = (articlesData.articles || []).filter(
              (a) => a.sentence_count > 0,
            );
            const sorted = sortArticlesByActivity(filtered);
            setArticles(sorted);

            await startStudying(urlSourceId);

            if (urlSentence) {
              const sentenceIdx = parseInt(urlSentence, 10);
              if (!isNaN(sentenceIdx)) setCurrentIndex(sentenceIdx);
            }

            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
        }

        // Restore last session
        if (lastSession?.source_id?.startsWith("epub:")) {
          const parts = lastSession.source_id.split(":");
          if (parts.length >= 3) {
            const filename = parts[1];
            const book = (booksData.books || []).find(
              (b) => b.filename === filename,
            );
            setSelectedBook(book || { filename, title: filename });

            const articlesData = await sentenceStudyApi.getArticles(filename);
            const filtered = (articlesData.articles || []).filter(
              (a) => a.sentence_count > 0,
            );
            const sorted = sortArticlesByActivity(filtered);
            setArticles(sorted);

            if (sorted.find((a) => a.source_id === lastSession.source_id)) {
              await startStudying(lastSession.source_id);
            } else {
              setView(VIEW_STATES.ARTICLE_LIST);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load initial data:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Update extra context for explain-word API when sentence changes
  useEffect(() => {
    const prevSentence =
      currentIndex > 0 ? flatSentences[currentIndex - 1]?.text : null;
    const nextSentence =
      currentIndex < flatSentences.length - 1
        ? flatSentences[currentIndex + 1]?.text
        : null;
    setExtraContext({ prevSentence, nextSentence });
  }, [currentIndex, flatSentences, setExtraContext]);

  // === Collocations Effect ===
  useEffect(() => {
    const currentSentenceText = flatSentences[currentIndex]?.text;
    if (!currentSentenceText || view !== VIEW_STATES.STUDYING) {
      setCollocations([]);
      return;
    }

    let cancelled = false;

    setCollocations([]);

    const fetchCollocations = async () => {
      try {
        const data =
          await sentenceStudyApi.detectCollocations(currentSentenceText);
        if (!cancelled) setCollocations(data.collocations || []);
      } catch (e) {
        console.error("Failed to detect collocations:", e);
        if (!cancelled) setCollocations([]);
      }
    };

    fetchCollocations();

    // Prefetch upcoming
    const upcoming = flatSentences
      .slice(currentIndex + 1, currentIndex + 4)
      .map((s) => s?.text)
      .filter(Boolean);
    if (upcoming.length > 0) sentenceStudyApi.prefetchCollocations(upcoming);

    return () => {
      cancelled = true;
    };
  }, [currentIndex, view, flatSentences]);

  const playAudio = useCallback((text) => {
    if (!text) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);
    audioRef.current = audio;
    audio.play().catch(console.error);
  }, []);

  const startStudying = useCallback(
    async (sourceId) => {
      setLoading(true);

      try {
        const [article, progressData] = await Promise.all([
          sentenceStudyApi.getArticle(sourceId, highlightOptionIndex),
          sentenceStudyApi.getProgress(sourceId),
        ]);

        setCurrentArticle(article);
        setProgress(progressData);
        setWordClicks([]);
        // setSimplifiedText(null);
        setOverviewStreamContent("");
        setOverview(null);

        const totalSentences =
          article.sentence_count || article.sentences?.length || 0;
        if (
          progressData.current_index >= totalSentences &&
          totalSentences > 0
        ) {
          const highlights = await sentenceStudyApi.getStudyHighlights(
            sourceId,
            totalSentences,
          );
          setStudyHighlights(highlights);
          setCurrentIndex(0);
          setView(VIEW_STATES.COMPLETED);
          return;
        }

        setCurrentIndex(progressData.current_index || 0);
        setView(VIEW_STATES.OVERVIEW);

        // Stream overview
        const res = await sentenceStudyApi.getOverview(
          article.title,
          article.full_text,
          totalSentences,
        );

        if (isSSEResponse(res)) {
          await parseJSONSSEStream(res, {
            onChunk: (content) =>
              setOverviewStreamContent((prev) => prev + content),
            onDone: (data) => setOverview(data.overview),
          });
        } else {
          setOverview(await res.json());
        }
      } catch (e) {
        console.error("Failed to load article:", e);
      } finally {
        setLoading(false);
        setLoading(false);
      }
    },
    [highlightOptionIndex],
  );

  const startSentenceStudy = useCallback(() => {
    setStartTime(Date.now());
    setView(VIEW_STATES.STUDYING);
  }, []);

  // Track word/phrase clicks and delegate to hook
  const handleWordClick = useCallback(
    (word, sentence, keyWord) => {
      if (!word) return;
      const cleanWord = word.toLowerCase().trim();
      if (cleanWord.length < 2) return;

      if (settings.autoPronounce) {
        playAudio(cleanWord);
      }

      const hasMultipleWords = cleanWord.includes(" ");

      // Immediately mark as "difficult"/highlighted for this session
      setGlobalDifficultWords((prev) => {
        const next = new Set(prev);
        next.add(cleanWord);
        return next;
      });

      // Track for study metrics

      if (hasMultipleWords) {
        if (!phraseClicks.includes(cleanWord))
          setPhraseClicks((prev) => [...prev, cleanWord]);
      } else {
        if (!wordClicks.includes(cleanWord))
          setWordClicks((prev) => [...prev, cleanWord]);
      }

      // Delegate to shared hook for inspector logic
      baseHandleWordClick(
        cleanWord,
        sentence || flatSentences[currentIndex]?.text || "",
        keyWord,
      );
    },
    [
      wordClicks,
      phraseClicks,
      baseHandleWordClick,
      flatSentences,
      currentIndex,
      playAudio,
      settings.autoPronounce,
    ],
  );

  const handleClear = useCallback(async () => {
    const dwellTime = Date.now() - startTime;
    const currentSentence = flatSentences[currentIndex];
    const wordCount =
      currentSentence?.text?.split(/\s+/).filter((w) => w.length > 0).length ||
      0;

    await sentenceStudyApi.recordLearning({
      source_type: "epub",
      source_id: currentArticle.id,
      sentence_index: currentIndex,
      sentence_text: currentSentence?.text,
      initial_response: "clear",
      word_clicks: wordClicks,
      phrase_clicks: phraseClicks,
      dwell_time_ms: dwellTime,
      word_count: wordCount,
    });

    advanceToNext("clear");
  }, [
    currentArticle,
    currentIndex,
    wordClicks,
    phraseClicks,
    startTime,
    flatSentences,
  ]);

  const handleDifficultyChoice = useCallback(
    async (choice, stage = 1) => {
      setIsSimplifying(true);
      // Default to 'meaning' if not specified, though backend mainly uses stage now
      const type = choice || "meaning";
      setSimplifyingType(type);
      setSimplifyStage(stage);
      setSimplifiedText("");

      const currentSentence = flatSentences[currentIndex]?.text || "";
      const prevSentence =
        currentIndex > 0 ? flatSentences[currentIndex - 1]?.text : null;
      const nextSentence =
        currentIndex < flatSentences.length - 1
          ? flatSentences[currentIndex + 1]?.text
          : null;

      try {
        const res = await authFetch("/api/sentence-study/simplify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sentence: currentSentence,
            simplify_type: type,
            stage,
            prev_sentence: prevSentence,
            next_sentence: nextSentence,
          }),
        });

        if (!res.ok) throw new Error("Simplify request failed");

        let streamedText = "";
        await parseJSONSSEStream(res, {
          onChunk: (content) => {
            streamedText += content;
            setSimplifiedText(streamedText);
          },
          onDone: (data) => setSimplifyStage(data.stage),
        });
      } catch (e) {
        console.error("Simplify failed:", e);
        setSimplifiedText("Failed to generate. Please try again.");
      } finally {
        setIsSimplifying(false);
      }
    },
    [currentIndex, flatSentences],
  );

  const handleUnclear = useCallback(() => {
    // Start directly with Stage 1 (Vocabulary)
    handleDifficultyChoice("meaning", 1);
  }, [handleDifficultyChoice]);

  const handleSimplifiedResponse = useCallback(
    async (gotIt) => {
      const dwellTime = Date.now() - startTime;
      const currentSentence = flatSentences[currentIndex];
      const wordCount =
        currentSentence?.text?.split(/\s+/).filter((w) => w.length > 0)
          .length || 0;

      await sentenceStudyApi.recordLearning({
        source_type: "epub",
        source_id: currentArticle.id,
        sentence_index: currentIndex,
        sentence_text: currentSentence?.text,
        initial_response: "unclear",
        unclear_choice: simplifyingType || "meaning", // Default to meaning
        simplified_response: gotIt ? "got_it" : "still_unclear",
        word_clicks: wordClicks,
        phrase_clicks: phraseClicks,
        dwell_time_ms: dwellTime,
        word_count: wordCount,
        max_simplify_stage: simplifyStage,
      });

      if (gotIt) {
        advanceToNext("unclear");
      } else if (simplifyStage < 4) {
        // Move to next stage
        setSimplifiedText(null);
        handleDifficultyChoice(simplifyingType, simplifyStage + 1);
      } else {
        // Max stage reached
        advanceToNext("unclear");
      }
    },
    [
      currentArticle,
      currentIndex,
      wordClicks,
      phraseClicks,
      startTime,
      simplifyingType,
      simplifyStage,
      handleDifficultyChoice,
      flatSentences,
    ],
  );

  const advanceToNext = useCallback(
    async (result) => {
      const updateProgress = (prev) => ({
        ...prev,
        studied_count: prev.studied_count + 1,
        current_index: prev.current_index + 1,
        clear_count:
          result === "clear" ? (prev.clear_count || 0) + 1 : prev.clear_count,
        unclear_count:
          result === "unclear"
            ? (prev.unclear_count || 0) + 1
            : prev.unclear_count,
      });

      if (currentIndex < flatSentences.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setWordClicks([]);
        setPhraseClicks([]);
        setStartTime(Date.now());
        setSimplifiedText(null);
        setSimplifyingType(null);
        setSimplifyStage(1);
        setProgress(updateProgress);
      } else {
        // Use backend API values for accurate progress when completing article
        const highlights = await sentenceStudyApi.getStudyHighlights(
          currentArticle.id,
          flatSentences.length,
        );
        setStudyHighlights(highlights);
        // Use API response values to ensure accuracy (fixes clear rate display issue)
        setProgress((prev) => ({
          ...prev,
          studied_count: highlights.studied_count,
          clear_count: highlights.clear_count,
          current_index: highlights.studied_count, // All sentences completed
        }));
        setView(VIEW_STATES.COMPLETED);
      }
    },
    [currentArticle, currentIndex, flatSentences],
  );

  const handleBack = useCallback(async () => {
    if (
      view === VIEW_STATES.STUDYING ||
      view === VIEW_STATES.OVERVIEW ||
      view === VIEW_STATES.COMPLETED
    ) {
      setView(VIEW_STATES.ARTICLE_LIST);
      setCurrentArticle(null);
      setCurrentIndex(0);
      setStudyHighlights({ word_clicks: [], phrase_clicks: [] });
      // Refresh article status to update completed status
      if (selectedBook?.filename) {
        const sorted = await fetchStatusAndSort(selectedBook.filename, [
          ...articles,
        ]);
        setArticles(sorted);
      }
    } else if (view === VIEW_STATES.ARTICLE_LIST) {
      navigate("/nav");
    } else {
      navigate("/nav");
    }
  }, [view, navigate, selectedBook, articles]);

  const handleUndo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setWordClicks([]);
      setPhraseClicks([]);
      setStartTime(Date.now());
      setSimplifiedText(null);
      setSimplifyingType(null);
      setSimplifyStage(1);
    }
  }, [currentIndex]);

  const handleMarkAsKnown = useCallback(
    async (word) => {
      // 1. Optimistic UI update: Remove highlight & close modal immediately
      const lowerWord = word.toLowerCase();

      setGlobalDifficultWords((prev) => {
        const next = new Set(prev);
        next.delete(lowerWord);
        next.delete(word);
        return next;
      });

      setSessionKnownWords((prev) => {
        const next = new Set(prev);
        next.add(lowerWord);
        next.add(word);
        return next;
      });

      closeInspector();

      // 2. Perform API call in background
      try {
        await apiPut("/api/proficiency/word", { word, status: "mastered" });
        addToast(`Marked "${word}" as known`, "success");
      } catch (e) {
        console.error("Failed to mark word as known:", e);
        addToast("Failed to sync status to server", "error");
      }
    },
    [closeInspector, addToast],
  );

  // === Render ===
  const renderView = () => {
    switch (view) {
      case VIEW_STATES.BOOK_SHELF:
        return (
          <BookShelfView
            books={books}
            loading={loading}
            onSelectBook={selectBook}
          />
        );
      case VIEW_STATES.ARTICLE_LIST:
        return (
          <ArticleListView
            selectedBook={selectedBook}
            articles={articles}
            loading={loading}
            onBack={handleBack}
            onSelectArticle={startStudying}
            books={books}
            onSelectBook={selectBook}
          />
        );
      case VIEW_STATES.OVERVIEW:
        return (
          <OverviewView
            article={currentArticle}
            overview={overview}
            overviewStreamContent={overviewStreamContent}
            onBack={handleBack}
            onStartStudying={startSentenceStudy}
          />
        );
      case VIEW_STATES.COMPLETED:
        return (
          <CompletedView
            article={currentArticle}
            sentences={currentArticle?.sentences || []}
            studyHighlights={studyHighlights}
            progress={progress}
            onBack={handleBack}
            onWordClick={handleWordClick}
          />
        );
      case VIEW_STATES.STUDYING:
      default:
        return (
          <StudyingView
            currentSentence={flatSentences[currentIndex]}
            prevSentence={
              currentIndex > 0 ? flatSentences[currentIndex - 1] : null
            }
            currentIndex={currentIndex}
            totalSentences={flatSentences.length}
            highlightSet={currentArticle?.highlightSet}
            globalDifficultWords={globalDifficultWords}
            knownWords={sessionKnownWords}
            collocations={collocations}
            wordClicks={wordClicks}
            simplifiedText={simplifiedText}
            simplifyStage={simplifyStage}
            isSimplifying={isSimplifying}
            sentenceContainerRef={sentenceContainerRef}
            onBack={handleBack}
            onWordClick={handleWordClick}
            onClear={handleClear}
            onUnclear={handleUnclear}
            onSimplifiedResponse={handleSimplifiedResponse}
            onUndo={handleUndo}
          />
        );
    }
  };

  return (
    <>
      {renderView()}

      {/* Word Inspector Modal */}
      {selectedWord && (
        <WordInspector
          selectedWord={selectedWord}
          inspectorData={inspectorData}
          isInspecting={isInspecting}
          onClose={closeInspector}
          onPlayAudio={playAudio}
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
      )}
    </>
  );
};

export default SentenceStudy;
