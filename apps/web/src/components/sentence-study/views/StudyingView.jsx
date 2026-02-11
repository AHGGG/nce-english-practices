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
  globalDifficultWords = new Set(), // New prop
  knownWords = new Set(), // Words marked known in this session
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
      {/* Background Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-secondary/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03]" />
      </div>

      {/* Header */}
      <header className="relative z-[60] flex-shrink-0 h-14 md:h-16 border-b border-white/[0.05] flex items-center justify-between px-4 md:px-8 bg-bg-base/80 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors group px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-xs font-bold uppercase tracking-widest">
            Exit
          </span>
        </button>

        <div className="text-[10px] font-mono font-bold tracking-widest text-white/30 border border-white/10 px-3 py-1 rounded-full">
          {currentIndex + 1} / {totalSentences}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="relative z-10 flex-shrink-0 h-[3px] bg-white/[0.05]">
        <div
          className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--color-accent-primary-rgb),0.5)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Content Area - Centered when idle, top-aligned when showing content */}
      <main className="relative z-10 flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div
          className={`min-h-full flex flex-col items-center p-4 md:p-8 pb-32 ${simplifiedText || isSimplifying ? "justify-start pt-8 md:pt-12" : "justify-center"}`}
        >
          {/* Main Sentence Card */}

          <div className="max-w-3xl w-full bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden ring-1 ring-white/5">
            {/* Card Header (Review Mode Style) */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              {/* Left: Progress/Label */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-accent-primary uppercase tracking-widest font-mono">
                  Sentence {currentIndex + 1}
                </span>
                {isSimplifying && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/20 rounded-full text-[9px] uppercase font-bold tracking-wide animate-pulse">
                    <div className="w-1.5 h-1.5 bg-accent-primary rounded-full" />
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-text-secondary hover:text-white transition-colors rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 uppercase tracking-wider"
                    title="Previous Sentence (Undo)"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Undo</span>
                  </button>
                )}

                {/* Context Toggle */}
                {prevSentence && (
                  <button
                    onClick={() => setShowContext(!showContext)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold transition-all rounded-lg border uppercase tracking-wider ${
                      showContext
                        ? "bg-accent-info/10 text-accent-info border-accent-info/30 shadow-[0_0_10px_rgba(var(--color-accent-info-rgb),0.1)]"
                        : "text-text-secondary hover:text-white border-transparent hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Context</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expandable Context Panel */}
            {showContext && prevSentence && (
              <div className="px-6 md:px-8 py-4 md:py-6 bg-black/20 border-b border-white/5 animate-in slide-in-from-top-2 duration-300">
                <div className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3">
                  Previous Sentence
                </div>
                <p className="font-serif text-base md:text-lg text-white/60 leading-relaxed italic">
                  {prevSentence.text}
                </p>
              </div>
            )}

            {/* Current Sentence Content */}
            <div
              ref={sentenceContainerRef}
              className="p-6 md:p-12 font-serif text-xl md:text-3xl leading-relaxed text-left select-text relative"
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
                  studyWordSet={globalDifficultWords} // Use global difficult words as study word highlights (Amber underline)
                  studyPhraseSet={new Set()} // No phrase highlights in sentence study mode
                  knownWords={knownWords}
                  showHighlights={true}
                  collocations={collocations}
                />
              ) : (
                <span className="text-white/20 italic">
                  No sentence available
                </span>
              )}
            </div>

            {/* Word clicks indicator */}
            {wordClicks.length > 0 && (
              <div className="px-8 pb-6 border-t border-white/5 pt-4">
                <div className="flex flex-wrap gap-2 items-center justify-center">
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mr-2">
                    Inspected:
                  </span>
                  {wordClicks.map((word, idx) => (
                    <span
                      key={idx}
                      className="text-xs text-accent-primary/70 font-mono bg-accent-primary/5 px-2 py-0.5 rounded border border-accent-primary/10"
                    >
                      {word}
                    </span>
                  ))}
                </div>
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
          className={`flex-shrink-0 p-6 border-t border-white/[0.05] bg-bg-base/80 backdrop-blur-xl relative z-20 ${currentEpisode ? "pb-32" : ""}`}
        >
          <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-4">
            <button
              onClick={onClear}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-accent-primary text-black font-bold uppercase text-sm tracking-widest hover:bg-accent-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all touch-manipulation rounded-xl shadow-[0_0_20px_rgba(var(--color-accent-primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-accent-primary-rgb),0.5)]"
            >
              <CheckCircle className="w-5 h-5" />
              Clear
            </button>
            <button
              onClick={onUnclear}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 border border-white/20 bg-white/5 text-white font-bold uppercase text-sm tracking-widest hover:bg-white/10 hover:border-white/30 active:scale-[0.98] transition-all touch-manipulation rounded-xl backdrop-blur-md"
            >
              <HelpCircle className="w-5 h-5 text-accent-warning" />
              Unclear
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default StudyingView;
