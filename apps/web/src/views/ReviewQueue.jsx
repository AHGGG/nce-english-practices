import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  RotateCcw,
  CheckCircle,
  Zap,
  Loader2,
  BookOpen,
  RefreshCw,
  Clock,
  SkipForward,
  Volume2,
  Sparkles,
  Brain,
} from "lucide-react";

import ExplanationCard from "../components/sentence-study/views/ExplanationCard";
import { getGapTypeInfo } from "../components/sentence-study/constants";
import useWordExplainer from "../hooks/useWordExplainer";
import WordInspector from "../components/reading/WordInspector";
import { authFetch } from "../api/auth";
import { useToast } from "../components/ui";
import { useGlobalState } from "../context/GlobalContext";
import { usePodcast } from "../context/PodcastContext";

// API helpers for SM-2 review system
const api = {
  async getQueue(limit = 20) {
    const res = await authFetch(`/api/review/queue?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch review queue");
    return res.json();
  },
  async getRandomQueue(limit = 20) {
    const res = await authFetch(`/api/review/random?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch random queue");
    return res.json();
  },
  async complete(itemId, quality, durationMs = 0) {
    const res = await authFetch("/api/review/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        quality,
        duration_ms: durationMs,
      }),
    });
    if (!res.ok) throw new Error("Failed to complete review");
    return res.json();
  },
  async getStats() {
    const res = await authFetch(`/api/review/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },
  async getContext(itemId) {
    const res = await authFetch(`/api/review/context/${itemId}`);
    if (!res.ok) throw new Error("Failed to fetch context");
    return res.json();
  },
};

// Rating options per design spec (SM-2 quality scores)
const RATING_OPTIONS = [
  {
    quality: 1,
    label: "Forgot",
    icon: RotateCcw,
    color: "text-accent-danger",
    bgColor: "bg-accent-danger/10",
    hoverBg: "hover:bg-accent-danger/20",
    borderColor: "border-accent-danger/30",
  },
  {
    quality: 3,
    label: "Remembered",
    icon: CheckCircle,
    color: "text-accent-primary",
    bgColor: "bg-accent-primary/10",
    hoverBg: "hover:bg-accent-primary/20",
    borderColor: "border-accent-primary/30",
  },
  {
    quality: 5,
    label: "Easy",
    icon: Zap,
    color: "text-accent-warning",
    bgColor: "bg-accent-warning/10",
    hoverBg: "hover:bg-accent-warning/20",
    borderColor: "border-accent-warning/30",
  },
];

// Highlight words in sentence - supports clickable mode for dictionary lookup
const HighlightedSentence = ({
  text,
  highlights = [],
  clickable = false,
  onWordClick,
  sentence,
}) => {
  if (!highlights || highlights.length === 0) {
    return <span>{text}</span>;
  }

  // Build regex pattern from highlights
  const pattern = highlights
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        const isHighlight = highlights.some(
          (h) => h.toLowerCase() === part.toLowerCase(),
        );
        return isHighlight ? (
          <mark
            key={i}
            className={`bg-accent-primary/20 text-accent-primary px-1 rounded ${clickable
              ? "cursor-pointer hover:bg-accent-primary/40 transition-colors animate-[pulse-highlight_1.5s_ease-in-out_2]"
              : ""
              }`}
            style={
              clickable
                ? {
                  animation: "pulse-highlight 0.6s ease-in-out 3",
                }
                : undefined
            }
            onClick={
              clickable && onWordClick
                ? (e) => {
                  e.stopPropagation();
                  onWordClick(part, sentence || text);
                }
                : undefined
            }
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
      {/* Inject keyframes for pulse animation */}
      {clickable && (
        <style>{`
                    @keyframes pulse-highlight {
                        0%, 100% { background-color: rgba(0, 255, 148, 0.2); }
                        50% { background-color: rgba(0, 255, 148, 0.4); box-shadow: 0 0 8px rgba(0, 255, 148, 0.3); }
                    }
                `}</style>
      )}
    </>
  );
};

const ReviewQueue = () => {
  const navigate = useNavigate();
  const {
    state: { settings },
  } = useGlobalState();
  const { currentEpisode } = usePodcast();
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({
    total_items: 0,
    due_items: 0,
    total_reviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [isRandomMode, setIsRandomMode] = useState(false);

  // Context state
  const [contextData, setContextData] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const { addToast } = useToast();

  // Help panel state
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [helpStage, setHelpStage] = useState(1);
  const [helpContent, setHelpContent] = useState("");
  const [isLoadingHelp, setIsLoadingHelp] = useState(false);
  const helpRequestIdRef = useRef(0);
  const helpContainerRef = useRef(null);

  // Word explainer hook for dictionary lookup in help panel
  const {
    selectedWord: inspectedWord,
    inspectorData,
    isInspecting,
    contextExplanation: wordExplanation,
    isExplaining: isExplainingWord,
    isPhrase,
    explainStyle,
    handleWordClick: baseHandleWordClick,
    closeInspector,
    changeExplainStyle,
    generatedImage,
    isGeneratingImage,
    imagePrompt,
    generateImage,
  } = useWordExplainer();

  // Audio ref
  const audioRef = useRef(null);

  // Timer state
  const [startTime, setStartTime] = useState(Date.now());

  // Track auto-play history to avoid duplicate playback on re-renders
  const lastPlayedIdRef = useRef(null);

  // Undo/Redo state
  const [undoState, setUndoState] = useState(null);

  // Load queue and stats
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [queueData, statsData] = await Promise.all([
          api.getQueue(),
          api.getStats(),
        ]);
        setQueue(queueData.items || []);
        setStats(statsData);
      } catch (e) {
        console.error("Failed to load review data:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Current item
  const currentItem = queue[currentIndex];

  // Play TTS
  const playAudio = useCallback((text) => {
    if (!text) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const url = `/api/tts?text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch((e) => {
      // Ignore autoplay blocks (NotAllowedError)
      if (e.name === "NotAllowedError") {
        console.debug("Autoplay blocked by browser policy");
        return;
      }
      console.error(e);
    });
  }, []);

  // Wrapper for word click to handle auto-pronounce
  const handleWordClick = useCallback(
    (word, sentence) => {
      if (!word) return;
      if (settings.autoPronounce) {
        playAudio(word);
      }
      baseHandleWordClick(word, sentence);
    },
    [settings.autoPronounce, playAudio, baseHandleWordClick],
  );

  // Reset timer when item changes
  useEffect(() => {
    if (showHelpPanel || isInspecting) return;
    if (currentItem) {
      setStartTime(Date.now());
    }
  }, [
    currentItem,
    settings.autoPronounce,
    playAudio,
    showHelpPanel,
    isInspecting,
  ]);

  // Start random review
  const startRandomReview = async () => {
    setLoading(true);
    try {
      const queueData = await api.getRandomQueue();
      setQueue(queueData.items || []);
      setIsRandomMode(true);
      setCurrentIndex(0);
      setLastResult(null);
      setContextData(null);
      setShowContext(false);
    } catch (e) {
      console.error("Failed to start random review:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle rating selection
  const handleRating = useCallback(
    async (quality) => {
      if (!currentItem || isSubmitting) return;

      setIsSubmitting(true);
      try {
        if (isRandomMode) {
          await new Promise((r) => setTimeout(r, 300));
          if (currentIndex < queue.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setLastResult(null);
          } else {
            setQueue([]);
            setLastResult(null);
          }
          return;
        }

        const duration = Date.now() - startTime;
        const result = await api.complete(currentItem.id, quality, duration);
        setLastResult(result);

        setUndoState({
          mode: "undo",
          itemId: currentItem.id,
          quality,
          durationMs: duration,
        });

        setShowHelpPanel(false);
        setHelpStage(1);
        setHelpContent("");
        setContextData(null);
        setShowContext(false);

        if (currentIndex < queue.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          const queueData = await api.getQueue();
          setQueue(queueData.items || []);
          setCurrentIndex(0);
          setUndoState(null);
        }
      } catch (e) {
        console.error("Failed to submit review:", e);
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
    ],
  );

  // Stream explanation content
  const streamExplanation = useCallback(
    async (stage) => {
      if (!currentItem) return;

      const currentRequestId = ++helpRequestIdRef.current;
      setIsLoadingHelp(true);
      setHelpContent("");
      setHelpStage(stage);

      const hasHighlights = currentItem.highlighted_items?.length > 0;

      try {
        let res;
        // Stage 1 for highlighted items still focuses on the word/collocation
        if (hasHighlights && stage === 1) {
          const text = currentItem.highlighted_items.join(", ");
          res = await authFetch("/api/sentence-study/explain-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              sentence: currentItem.sentence_text,
              style: "brief",
            }),
          });
        } else {
          // All other stages (or items without highlights) use the full sentence simplification/analysis
          res = await authFetch("/api/sentence-study/simplify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sentence: currentItem.sentence_text,
              simplify_type: "meaning",
              stage,
              prev_sentence: contextData?.previous_sentence,
              next_sentence: contextData?.next_sentence,
            }),
          });
        }

        if (helpRequestIdRef.current !== currentRequestId) return;
        if (!res.ok) throw new Error("Failed to fetch explanation");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (helpRequestIdRef.current !== currentRequestId) {
            reader.cancel();
            return;
          }
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (helpRequestIdRef.current !== currentRequestId) return;
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]" || data.startsWith("[ERROR]")) break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "chunk") {
                  streamedText += parsed.content;
                  setHelpContent(streamedText);
                }
              } catch {
                const decoded = data.replace(/\[NL\]/g, "\n");
                streamedText += decoded;
                setHelpContent(streamedText);
              }
            }
          }
        }
      } catch (e) {
        console.error("Stream explanation error:", e);
        if (helpRequestIdRef.current === currentRequestId) {
          setHelpContent("加载失败，请重试");
        }
      } finally {
        if (helpRequestIdRef.current === currentRequestId) {
          setIsLoadingHelp(false);
        }
      }
    },
    [currentItem],
  );

  // Auto-scroll help content
  useEffect(() => {
    if (helpContainerRef.current) {
      helpContainerRef.current.scrollTop =
        helpContainerRef.current.scrollHeight;
    }
  }, [helpContent]);

  const handleForgot = useCallback(() => {
    setShowHelpPanel(true);
    streamExplanation(1);
  }, [streamExplanation]);

  const handleHelpResponse = useCallback(
    async (remembered) => {
      if (remembered) {
        await handleRating(2);
      } else if (helpStage < 4) {
        streamExplanation(helpStage + 1);
      } else {
        await handleRating(1);
      }
    },
    [helpStage, handleRating, streamExplanation],
  );

  const handleSkipHelp = useCallback(async () => {
    await handleRating(1);
  }, [handleRating]);

  const toggleContext = useCallback(async () => {
    if (showContext) {
      setShowContext(false);
      return;
    }

    if (contextData) {
      setShowContext(true);
      return;
    }

    setLoadingContext(true);
    try {
      const data = await api.getContext(currentItem.id);
      setContextData(data);
      setShowContext(true);
    } catch (e) {
      console.error("Failed to fetch context:", e);
    } finally {
      setLoadingContext(false);
    }
  }, [currentItem, contextData, showContext]);

  const refreshQueue = useCallback(async () => {
    setLoading(true);
    setIsRandomMode(false);
    try {
      const [queueData, statsData] = await Promise.all([
        api.getQueue(),
        api.getStats(),
      ]);
      setQueue(queueData.items || []);
      setStats(statsData);
      setCurrentIndex(0);
      setLastResult(null);
      setContextData(null);
      setShowContext(false);
    } catch (e) {
      console.error("Failed to refresh:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUndoRedo = useCallback(async () => {
    if (loading || isSubmitting || !undoState) return;

    setIsSubmitting(true);
    try {
      if (undoState.mode === "undo") {
        const res = await authFetch("/api/review/undo", {
          method: "POST",
        });

        if (!res.ok) {
          if (res.status === 404) {
            addToast("无可撤销的历史记录", "warning");
            setUndoState(null);
          } else {
            throw new Error("Undo failed");
          }
          return;
        }

        const restoredItem = await res.json();
        setQueue((prev) => [restoredItem, ...prev]);
        setCurrentIndex(0);
        setLastResult(null);
        setStats((prev) => ({
          ...prev,
          due_items: prev.due_items + 1,
          total_reviews: Math.max(0, prev.total_reviews - 1),
        }));
        setUndoState((prev) => ({ ...prev, mode: "redo" }));
      } else if (undoState.mode === "redo") {
        const result = await api.complete(
          undoState.itemId,
          undoState.quality,
          undoState.durationMs,
        );
        setLastResult(result);
        setQueue((prev) => prev.slice(1));
        setStats((prev) => ({
          ...prev,
          due_items: Math.max(0, prev.due_items - 1),
          total_reviews: prev.total_reviews + 1,
        }));
        setUndoState((prev) => ({ ...prev, mode: "undo" }));
      }
    } catch (e) {
      console.error("Undo/Redo error:", e);
      addToast("操作失败，请重试", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [loading, isSubmitting, undoState]);

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center flex-1 px-4 relative z-10">
      <div className="w-24 h-24 rounded-full bg-accent-primary/5 flex items-center justify-center mb-8 border border-accent-primary/20 shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.1)] animate-pulse-slow">
        <CheckCircle className="w-12 h-12 text-accent-primary" />
      </div>
      <h2 className="text-3xl font-serif text-white font-bold mb-3 tracking-tight">
        All Caught Up
      </h2>
      <p className="text-white/50 text-base text-center max-w-sm mb-10 leading-relaxed">
        You've completed your review queue for now. Outstanding effort!
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={startRandomReview}
          className="group relative flex items-center gap-3 px-8 py-4 bg-accent-primary text-[#0a0f0d] rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-white transition-all duration-300 shadow-lg shadow-accent-primary/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Zap className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Random Review</span>
        </button>

        <button
          onClick={refreshQueue}
          className="flex items-center gap-2 px-8 py-4 bg-white/[0.05] text-white rounded-xl border border-white/10 font-bold uppercase tracking-wider text-sm hover:bg-white/[0.1] hover:border-white/30 transition-all duration-300"
        >
          <RefreshCw className="w-4 h-4 text-white/60" />
          <span>Refresh Queue</span>
        </button>
      </div>
    </div>
  );

  // Render stats header
  const renderStats = () => (
    <div className="flex items-center gap-3 md:gap-6 px-3 py-1.5 bg-white/[0.03] rounded-full border border-white/[0.08] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-white/70 tracking-wider">
          <span className="text-white/40 mr-1">CARD</span>
          <strong className="text-white">{currentIndex + 1}</strong>
          <span className="text-white/40 mx-1">/</span>
          <span className="text-white/40">{queue.length}</span>
        </span>
      </div>
      <div className="w-px h-3 bg-white/10" />
      <div className="flex items-center gap-2">
        <BookOpen className="w-3 h-3 text-accent-primary" />
        <span className="text-[10px] font-mono text-white/70 tracking-wider">
          <strong className="text-white">{stats.total_items}</strong> TOTAL
        </span>
      </div>
      <div className="w-px h-3 bg-white/10 hidden sm:block" />
      <div className="hidden sm:flex items-center gap-2">
        <Clock className="w-3 h-3 text-accent-secondary" />
        <span className="text-[10px] font-mono text-white/70 tracking-wider">
          <strong className="text-white">{queue.length}</strong> DUE
        </span>
      </div>
      {isRandomMode && (
        <>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5 text-accent-info">
            <Zap className="w-3 h-3" />
            <span className="text-[10px] uppercase font-bold tracking-widest">
              Random
            </span>
          </div>
        </>
      )}
    </div>
  );

  // Render review card
  const renderReviewCard = () => {
    if (!currentItem) return null;

    const sourceInfo = currentItem.source_id.split(":");
    const bookName = sourceInfo[1] || "Unknown";

    return (
      <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 relative z-10 pb-2 md:pb-4">
        {/* Progress Header */}
        <div className="flex justify-center mb-2 md:mb-4 w-full">{renderStats()}</div>

        {/* Glass Card */}
        <div className="relative bg-[#0a0f0d]/80 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-0 flex-1">
          {/* Top Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-primary/0 via-accent-primary/50 to-accent-primary/0 opacity-30" />

          {/* Card Header */}
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-white/5 bg-white/[0.02] gap-3">
            <div className="flex flex-1 items-center gap-2 min-w-0 overflow-hidden">
              <span className="px-2 py-1 rounded-md bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[9px] md:text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 truncate max-w-[120px] md:max-w-none">
                <BookOpen className="w-3 h-3 shrink-0" />
                <span className="truncate">{bookName}</span>
              </span>
              <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/60 text-[9px] md:text-[10px] font-bold uppercase tracking-wider font-mono whitespace-nowrap">
                {getGapTypeInfo(currentItem.difficulty_type).shortLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => playAudio(currentItem.sentence_text)}
                className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-transparent hover:border-white/10"
                title="Play Audio"
              >
                <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button
                onClick={toggleContext}
                disabled={loadingContext}
                className={`
                      h-7 md:h-8 px-2.5 md:px-3 rounded-lg flex items-center gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all border
                      ${showContext
                    ? "bg-accent-info/10 border-accent-info/30 text-accent-info shadow-[0_0_15px_rgba(var(--color-accent-info-rgb),0.1)]"
                    : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:border-white/10 hover:text-white"
                  }
                   `}
              >
                {loadingContext ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <BookOpen className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">Context</span>
              </button>
            </div>
          </div>

          {/* Context View */}
          <div
            className={`overflow-y-auto custom-scrollbar transition-all duration-500 ease-in-out ${showContext ? "max-h-[50vh] border-b border-white/5" : "max-h-0"}`}
          >
            {contextData && (
              <div className="p-6 bg-[#000000]/30 text-sm md:text-base leading-relaxed text-white/70 font-serif">
                {contextData.previous_sentence && (
                  <p className="mb-4 opacity-50 pl-4 border-l-2 border-transparent">
                    {contextData.previous_sentence}
                  </p>
                )}
                <div className="pl-4 border-l-2 border-accent-info text-white my-4 py-1 relative">
                  <div className="absolute inset-0 bg-accent-info/5 -z-10 blur-sm rounded-r-lg" />
                  <HighlightedSentence
                    text={contextData.target_sentence}
                    highlights={currentItem.highlighted_items || []}
                  />
                </div>
                {contextData.next_sentence && (
                  <p className="mt-4 opacity-50 pl-4 border-l-2 border-transparent">
                    {contextData.next_sentence}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Main Sentence View */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 relative group min-h-[25vh] md:min-h-[400px]">
            {/* Background Decoration */}
            <div className="absolute inset-0 bg-gradient-radial from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="w-full max-w-3xl relative z-10">
              {currentItem?.highlighted_items?.length > 0 && (
                <div className="flex justify-center mb-6 opacity-0 animate-fade-in">
                  <span className="px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Tap highlights for definition
                  </span>
                </div>
              )}

              <p
                className={`font-serif text-xl sm:text-2xl md:text-4xl text-white leading-relaxed md:leading-tight text-left transition-opacity duration-300 ${showContext ? "opacity-70" : "opacity-100"}`}
              >
                <HighlightedSentence
                  text={currentItem.sentence_text}
                  highlights={currentItem.highlighted_items || []}
                  clickable={true}
                  onWordClick={handleWordClick}
                  sentence={currentItem.sentence_text}
                />
              </p>
            </div>
          </div>

          {/* Interval Info Footer */}
          <div className="px-6 py-3 border-t border-white/5 bg-white/[0.01] flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/30">
              {currentItem.repetition > 0 ? (
                <>
                  <span className="whitespace-nowrap">
                    Rep: {currentItem.repetition}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:block" />
                  <span className="whitespace-nowrap">
                    Int: {Math.round(currentItem.interval_days)}d
                  </span>
                </>
              ) : (
                <span>First Review</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Area */}
        {showHelpPanel ? (
          <div className="mt-2 md:mt-8 animate-in slide-in-from-bottom-5 duration-500 pb-4 md:pb-8">
            <ExplanationCard
              simplifiedText={helpContent}
              simplifyStage={helpStage}
              isSimplifying={isLoadingHelp}
              onSimplifiedResponse={handleHelpResponse}
            />

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleSkipHelp}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-white/30 hover:text-white/60 transition-colors text-xs font-mono uppercase tracking-widest group"
              >
                <SkipForward className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                <span>Skip for now</span>
              </button>
            </div>
          </div>
        ) : (
          /* Rating Buttons */
          <div className="mt-3 md:mt-8 grid grid-cols-3 gap-3 md:gap-6 pb-4 md:pb-8">
            {RATING_OPTIONS.map((option) => {
              const Icon = option.icon;
              const handleClick =
                option.quality === 1
                  ? handleForgot
                  : () => handleRating(option.quality);

              let baseStyles = "";
              let activeColor = "";

              if (option.quality === 1) {
                // Forgot
                baseStyles =
                  "border-accent-danger/20 hover:bg-accent-danger/10 hover:border-accent-danger/50 text-accent-danger";
                activeColor = "bg-accent-danger";
              } else if (option.quality === 3) {
                // Remembered
                baseStyles =
                  "border-accent-primary/20 hover:bg-accent-primary/10 hover:border-accent-primary/50 text-accent-primary";
                activeColor = "bg-accent-primary";
              } else {
                // Easy (5)
                baseStyles =
                  "border-accent-warning/20 hover:bg-accent-warning/10 hover:border-accent-warning/50 text-accent-warning";
                activeColor = "bg-accent-warning";
              }

              return (
                <button
                  key={option.quality}
                  onClick={handleClick}
                  disabled={isSubmitting}
                  className={`
                    group relative flex flex-col items-center gap-2 md:gap-3 p-3 md:p-8 rounded-xl md:rounded-2xl
                    bg-[#0a0f0d]/60 backdrop-blur-xl border transition-all duration-300
                    active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                    ${baseStyles}
                  `}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin opacity-50" />
                  ) : (
                    <>
                      <div
                        className={`
                        w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center 
                        bg-white/[0.03] border border-white/5 group-hover:scale-110 transition-transform duration-300
                        shadow-lg shadow-black/20
                      `}
                      >
                        <Icon className="w-4 h-4 md:w-6 md:h-6" />
                      </div>
                      <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">
                        {option.label}
                      </span>

                      {/* Hover Glow */}
                      <div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-xl md:rounded-2xl blur-xl ${activeColor}`}
                      />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback Text */}
        {lastResult && !isRandomMode && (
          <div className="mt-6 text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-[10px] font-mono text-white/40 uppercase tracking-widest">
              <span>
                Next Review:{" "}
                {new Date(lastResult.next_review_at).toLocaleDateString(
                  "zh-CN",
                )}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>(+{Math.round(lastResult.new_interval)} days)</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen h-[100dvh] bg-[#0a0f0d] relative overflow-hidden font-sans flex flex-col">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a1418] via-[#0c1815] to-[#0a0f0d] pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-radial from-emerald-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-gradient-radial from-teal-900/10 via-transparent to-transparent blur-3xl" />
      </div>
      <div
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Header */}
      <header className="relative z-20 px-4 py-3 flex items-center justify-between border-b border-white/[0.05] backdrop-blur-md bg-[#0a0f0d]/50 h-14 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/nav")}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] transition-all group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
              <Brain className="w-3 h-3 text-accent-primary" />
              Queue
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isRandomMode && undoState && (
            <button
              onClick={handleUndoRedo}
              disabled={isSubmitting}
              className={`
                h-8 px-2.5 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-all border
                ${undoState.mode === "redo"
                  ? "bg-accent-primary/10 border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20"
                  : "bg-white/[0.03] border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08]"
                }
              `}
              title={undoState.mode === "undo" ? "Undo" : "Redo"}
            >
              <RotateCcw
                className={`w-3 h-3 ${undoState.mode === "redo" ? "scale-x-[-1]" : ""}`}
              />
            </button>
          )}

          <button
            onClick={refreshQueue}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.08] hover:rotate-180 transition-all duration-500"
            title="Reload Queue"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className={`flex-1 flex flex-col relative z-10 overflow-y-auto overscroll-none custom-scrollbar pt-2 md:pt-4 ${currentEpisode ? 'pb-24' : 'pb-2 md:pb-4'}`}>
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-accent-primary/20 blur-xl rounded-full animate-pulse" />
              <Loader2 className="w-10 h-10 animate-spin text-accent-primary relative z-10" />
            </div>
            <span className="mt-4 text-xs font-mono uppercase tracking-widest text-white/40">
              Loading Queue...
            </span>
          </div>
        ) : queue.length === 0 ? (
          renderEmptyState()
        ) : (
          renderReviewCard()
        )}
      </main>

      {/* WordInspector */}
      {inspectedWord && (
        <WordInspector
          selectedWord={inspectedWord}
          inspectorData={inspectorData}
          isInspecting={isInspecting}
          onClose={closeInspector}
          onPlayAudio={playAudio}
          onMarkAsKnown={() => { }}
          contextExplanation={wordExplanation}
          isExplaining={isExplainingWord}
          isPhrase={isPhrase}
          onExplainStyle={changeExplainStyle}
          currentStyle={explainStyle}
          generatedImage={generatedImage}
          isGeneratingImage={isGeneratingImage}
          canGenerateImage={!!imagePrompt}
          onGenerateImage={generateImage}
        />
      )}
    </div>
  );
};

export default ReviewQueue;
