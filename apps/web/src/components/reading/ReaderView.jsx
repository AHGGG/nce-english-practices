import React, { useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Zap,
  Loader2,
  CheckCheck,
  GraduationCap,
} from "lucide-react";
import MemoizedSentence from "./MemoizedSentence";
import MemoizedImage from "./MemoizedImage";
import { HIGHLIGHT_OPTIONS, BATCH_SIZE } from "./constants";

/**
 * Reader View - Immersive article reading with word inspection
 */
const ReaderView = ({
  article,
  visibleCount,
  setVisibleCount,
  selectedOptionIndex,
  setSelectedOptionIndex,
  showHighlights,
  setShowHighlights,
  selectedWord,
  onWordClick,
  onSentenceClick, // NEW: Handle unclear sentence clicks
  onBackToLibrary,
  onImageClick,
  onSweep,
  trackerRef,
  calibrationBanner,
}) => {
  const mainRef = useRef(null);
  const sentinelRef = useRef(null);

  // Compute total content count (from blocks or legacy sentences)
  const totalContentCount =
    article?.blocks?.length > 0
      ? article.blocks.reduce(
          (acc, b) =>
            acc + (b.type === "paragraph" ? b.sentences?.length || 0 : 1),
          0,
        )
      : article?.sentences?.length || 0;

  // Progressive loading: Intersection Observer to load more sentences
  useEffect(() => {
    if (!article?.sentences && !article?.blocks) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + BATCH_SIZE, totalContentCount),
          );
        }
      },
      { rootMargin: "200px" },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [totalContentCount, setVisibleCount]);

  // Track sentence visibility for reading stats
  useEffect(() => {
    if ((!article?.sentences && !article?.blocks) || !trackerRef?.current)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && trackerRef.current) {
            const idx = entry.target.dataset.sentenceIdx;
            if (idx) {
              trackerRef.current.onSentenceView(idx);
            }
          }
        });
      },
      { rootMargin: "0px", threshold: 0.5 },
    );

    const sentenceEls = document.querySelectorAll("[data-sentence-idx]");
    sentenceEls.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [totalContentCount, visibleCount, trackerRef]);

  // Event delegation: handle clicks on article container
  const handleArticleClick = useCallback(
    (e) => {
      const target = e.target;

      // Check if clicking on an unclear sentence (not on a word)
      // Walk up the tree to find if we clicked inside an unclear sentence
      let el = target;
      while (el && el !== e.currentTarget) {
        if (el.dataset?.unclearSentence === "true") {
          // Only trigger sentence click if we didn't click on a word
          if (!target.dataset?.word) {
            const sentenceText = el.dataset.sentenceText;
            const unclearChoice = el.dataset.unclearChoice;
            if (sentenceText && onSentenceClick) {
              onSentenceClick(sentenceText, { unclear_choice: unclearChoice });
            }
            return;
          }
          break;
        }
        el = el.parentElement;
      }

      // Handle word click (existing logic)
      const word = target.dataset?.word;
      const sentence = target.dataset?.sentence;

      if (!word) return;

      const cleanWord = word.toLowerCase();
      if (cleanWord.length < 2) return;

      onWordClick(cleanWord, sentence || "");

      // Track word click for reading quality
      if (trackerRef?.current) {
        trackerRef.current.onWordClick();
      }
    },
    [onWordClick, onSentenceClick, trackerRef],
  );

  // Build elements for rendering - now uses blocks for proper ordering
  const renderContent = () => {
    const filename = article.metadata?.filename || "";

    // Use new blocks structure if available (preserves DOM order)
    if (article.blocks && article.blocks.length > 0) {
      let globalSentenceIndex = 0; // Track global sentence index for reading tracker

      return article.blocks.map((block, blockIdx) => {
        switch (block.type) {
          case "heading": {
            // Dynamic heading level (h1-h4)
            const level = block.level || 2;
            const className =
              level === 1
                ? "text-3xl font-serif text-text-primary mt-10 mb-6"
                : level === 2
                  ? "text-2xl font-serif text-text-primary mt-8 mb-4"
                  : "text-xl font-serif text-text-secondary mt-6 mb-3";
            return (
              <div key={`h-${blockIdx}`} className={className}>
                {block.text}
              </div>
            );
          }

          case "image": {
            const imgUrl = `/api/reading/epub/image?filename=${encodeURIComponent(filename)}&image_path=${encodeURIComponent(block.image_path)}`;
            return (
              <MemoizedImage
                key={`i-${blockIdx}`}
                src={imgUrl}
                alt={block.alt}
                caption={block.caption}
                onImageClick={onImageClick}
              />
            );
          }

          case "paragraph": {
            const startIdx = globalSentenceIndex;
            globalSentenceIndex += block.sentences.length;

            return (
              <div key={`p-${blockIdx}`} className="mb-4">
                {block.sentences.map((sentence, sentIdx) => {
                  const globalIdx = startIdx + sentIdx;
                  return (
                    <span key={`s-${globalIdx}`} data-sentence-idx={globalIdx}>
                      <MemoizedSentence
                        text={sentence}
                        highlightSet={article.highlightSet}
                        studyHighlightSet={article.studyHighlightSet}
                        showHighlights={showHighlights}
                        unclearInfo={article.unclearSentenceMap?.[globalIdx]}
                      />{" "}
                    </span>
                  );
                })}
              </div>
            );
          }

          case "subtitle": {
            return (
              <div
                key={`sub-${blockIdx}`}
                className="text-lg italic text-text-secondary mb-4 font-serif"
              >
                {block.text}
              </div>
            );
          }

          default:
            return null;
        }
      });
    }

    // No blocks available - return empty
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-bg-base text-text-primary font-mono selection:bg-accent-primary selection:text-text-inverse">
      {/* GLOBAL NOISE TEXTURE OVERLAY */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      {/* Calibration Suggestion Banner */}
      {calibrationBanner && (
        <div className="bg-accent-primary/10 border-b border-accent-primary/30 px-4 py-2 text-center text-xs text-accent-primary font-mono">
          {calibrationBanner}
        </div>
      )}

      {/* Toolbar - Industrial Style */}
      <header className="relative z-[60] h-16 border-b border-white/[0.05] flex items-center justify-between px-6 md:px-8 bg-bg-base/80 backdrop-blur-xl shrink-0">
        <button
          onClick={onBackToLibrary}
          className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Library
          </span>
        </button>

        {/* Highlight Controls */}
        <div className="flex items-center gap-2 md:gap-3 bg-white/[0.03] p-1 rounded-xl border border-white/10">
          <div className="relative group">
            <select
              value={selectedOptionIndex}
              onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
              className="bg-transparent text-text-primary text-xs font-mono font-bold uppercase py-1.5 pl-3 pr-8 focus:outline-none cursor-pointer transition-colors hover:text-white appearance-none relative z-10"
            >
              {HIGHLIGHT_OPTIONS.map((opt, i) => (
                <option key={i} value={i} className="bg-[#0c1418] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-text-muted group-hover:text-white z-0">
              <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
            </div>
          </div>

          <div className="w-px h-4 bg-white/10" />

          <button
            onClick={() => setShowHighlights(!showHighlights)}
            className={`p-1.5 rounded-lg transition-all duration-200 ${
              showHighlights
                ? "bg-accent-primary/20 text-accent-primary shadow-[0_0_10px_rgba(var(--color-accent-primary-rgb),0.2)]"
                : "text-text-muted hover:text-white hover:bg-white/5"
            }`}
            title="Toggle Highlights"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2">
          {/* Sweep Button */}
          <button
            onClick={onSweep}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-text-secondary hover:text-accent-primary hover:border-accent-primary/50 hover:bg-accent-primary/10 transition-all group"
            title="Mark Remaining as Known"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Sweep
            </span>
          </button>

          {/* Deep Study Button */}
          <button
            onClick={() => {
              window.location.href = `/sentence-study?source_id=${encodeURIComponent(article.id)}`;
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-primary text-black font-medium hover:bg-accent-primary/90 shadow-lg shadow-accent-primary/20 transition-all active:scale-95"
            title="Study this article sentence by sentence"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Study
            </span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Article Text */}
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto px-4 md:px-0 py-12 scroll-smooth custom-scrollbar"
        >
          <article className="max-w-2xl mx-auto pb-32">
            {/* Article Header - Cyber-Noir Style */}
            <header className="mb-12 px-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-2 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30 text-[10px] font-bold uppercase tracking-widest">
                  Reading Mode
                </span>
                <div className="h-px bg-gradient-to-r from-accent-primary/30 to-transparent flex-1"></div>
              </div>
              <h1 className="font-serif text-3xl md:text-5xl text-white mb-6 leading-[1.1] tracking-tight drop-shadow-2xl">
                {article.title}
              </h1>
              <div className="flex items-center gap-4 text-xs text-text-muted font-mono uppercase tracking-wider border-t border-white/5 pt-6">
                <span>{article.sentence_count} SENTENCES</span>
                <span className="text-white/20">/</span>
                <span>
                  {article.metadata?.filename?.split(".").slice(0, 2).join(" ")}
                </span>
              </div>
            </header>

            {/* Event delegation + CSS containment for performance */}
            <div
              className="prose prose-invert prose-lg max-w-none font-serif md:text-xl leading-loose text-text-primary px-4"
              style={{ contain: "content" }}
              data-selected-word={selectedWord || ""}
              onClick={handleArticleClick}
            >
              {renderContent()}

              {/* Sentinel element for Intersection Observer */}
              {visibleCount < totalContentCount && (
                <div
                  ref={sentinelRef}
                  className="flex justify-center py-4 text-text-muted"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="ml-2 text-xs font-mono">
                    Loading more...
                  </span>
                </div>
              )}
            </div>
          </article>
        </main>
      </div>
    </div>
  );
};

export default ReaderView;
