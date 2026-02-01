/**
 * StudyingView - Main sentence-by-sentence study interface
 * Shows current sentence with Clear/Unclear buttons and simplification flow
 */
import React from "react";
import {
  ChevronLeft,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import MemoizedSentence from "../../reading/MemoizedSentence";
import ExplanationCard from "./ExplanationCard";
import { usePodcast } from "../../../context/PodcastContext";

const StudyingView = ({
  // Data
  currentSentence,
  prevSentence,
  currentIndex,
  totalSentences,
  highlightSet,
  collocations = [],
  wordClicks = [],
  // State
  simplifiedText,
  simplifyStage,
  isSimplifying,
  // Refs
  sentenceContainerRef,
  // Handlers
  onBack,
  onWordClick,
  onClear,
  onUnclear,
  onSimplifiedResponse,
  onUndo,
}) => {
  const { currentEpisode } = usePodcast();
  const [showContext, setShowContext] = React.useState(false);

  const progressPercent =
    totalSentences > 0 ? (currentIndex / totalSentences) * 100 : 0;

  return (
    <div className="fixed inset-0 flex flex-col bg-bg-base text-text-primary font-mono overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-14 border-b border-border flex items-center justify-between px-4 md:px-8 bg-bg-surface z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Exit
          </span>
        </button>

        <div className="text-xs text-text-muted">
          {currentIndex + 1} / {totalSentences}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="flex-shrink-0 h-1 bg-bg-elevated">
        <div
          className="h-full bg-accent-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Content Area - Centered when idle, top-aligned when showing content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar min-h-0 relative">
        <div
          className={`min-h-full flex flex-col items-center p-4 md:p-8 pb-32 ${simplifiedText || isSimplifying ? "justify-start pt-8" : "justify-center"}`}
        >
          {/* Main Sentence Card */}

          <div className="max-w-3xl w-full border border-border bg-bg-surface rounded-lg shadow-sm overflow-hidden">
            {/* Card Header (Review Mode Style) */}
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-bg-elevated/30">
              {/* Left: Progress/Label */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Sentence {currentIndex + 1}
                </span>
                {isSimplifying && (
                  <span className="px-1.5 py-0.5 bg-accent-primary/10 text-accent-primary rounded text-[10px] uppercase font-bold tracking-wide">
                    Simplifying
                  </span>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {/* Undo Button */}
                {currentIndex > 0 && (
                  <button
                    onClick={onUndo}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-secondary hover:text-accent-primary transition-colors rounded hover:bg-bg-elevated/50"
                    title="Previous Sentence (Undo)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Undo</span>
                  </button>
                )}

                {/* Context Toggle */}
                {prevSentence && (
                  <button
                    onClick={() => setShowContext(!showContext)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs transition-colors rounded border ${
                      showContext
                        ? "bg-accent-info/10 text-accent-info border-accent-info/20"
                        : "text-text-secondary hover:text-text-primary border-transparent hover:bg-bg-elevated/50"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Context</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Context Panel */}
            {showContext && prevSentence && (
              <div className="px-6 py-4 bg-bg-elevated/20 border-b border-border-subtle animate-in slide-in-from-top-2 duration-200">
                <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Previous Sentence
                </div>
                <p className="font-serif text-lg text-text-secondary/70 leading-relaxed">
                  {prevSentence.text}
                </p>
              </div>
            )}

            {/* Current Sentence Content */}
            <div
              ref={sentenceContainerRef}
              className="p-6 md:p-8 font-serif text-xl md:text-2xl leading-relaxed text-left select-text bg-bg-surface"
              onClick={(e) => {
                const word = e.target.dataset?.word;
                const keyWord = e.target.dataset?.keyWord;
                if (word)
                  onWordClick(
                    word.toLowerCase(),
                    currentSentence?.text || "",
                    keyWord,
                  );
              }}
            >
              {currentSentence ? (
                <MemoizedSentence
                  text={currentSentence.text}
                  highlightSet={highlightSet}
                  showHighlights={true}
                  collocations={collocations}
                />
              ) : (
                <span className="text-text-muted">No sentence available</span>
              )}
            </div>

            {/* Word clicks indicator */}
            {wordClicks.length > 0 && (
              <div className="text-center text-xs text-text-muted mt-4">
                Looked up: {wordClicks.join(", ")}
              </div>
            )}

            {/* Simplified version */}
            <ExplanationCard
              simplifiedText={simplifiedText}
              simplifyStage={simplifyStage}
              isSimplifying={isSimplifying}
              onSimplifiedResponse={onSimplifiedResponse}
            />
          </div>
        </div>
      </main>

      {/* Fixed Bottom Action Buttons - hidden when explanation is showing */}
      {!isSimplifying && !simplifiedText && (
        <footer
          className={`flex-shrink-0 p-4 md:p-6 border-t border-border bg-bg-surface ${currentEpisode ? "pb-32" : ""}`}
        >
          <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-3">
            <button
              onClick={onClear}
              className="flex items-center justify-center gap-2 min-w-[140px] px-8 py-4 bg-accent-primary text-text-inverse font-bold uppercase text-sm hover:bg-accent-primary/80 active:scale-95 transition-all touch-manipulation rounded-md"
            >
              <CheckCircle className="w-5 h-5" />
              Clear
            </button>
            <button
              onClick={onUnclear}
              className="flex items-center justify-center gap-2 min-w-[140px] px-8 py-4 border border-text-muted text-text-secondary hover:text-text-primary hover:border-text-primary active:scale-95 transition-all touch-manipulation rounded-md"
            >
              <HelpCircle className="w-5 h-5" />
              Unclear
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default StudyingView;
