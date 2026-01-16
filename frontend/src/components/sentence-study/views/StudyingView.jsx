/**
 * StudyingView - Main sentence-by-sentence study interface
 * Shows current sentence with Clear/Unclear buttons and simplification flow
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';
import MemoizedSentence from '../../reading/MemoizedSentence';
import { DIFFICULTY_CHOICES } from '../constants';

// Markdown components for styled rendering
const markdownComponents = {
    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
    em: ({ children }) => <em className="text-accent-warning not-italic">{children}</em>,
    h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-white">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-white">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold mb-2 text-white">{children}</h3>,
};

const StudyingView = ({
    // Data
    currentSentence,
    currentIndex,
    totalSentences,
    highlightSet,
    collocations = [],
    wordClicks = [],
    // State
    showDiagnose,
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
    onDifficultyChoice,
    onSimplifiedResponse
}) => {
    const progressPercent = totalSentences > 0 ? ((currentIndex) / totalSentences) * 100 : 0;

    return (
        <div className="h-dvh flex flex-col bg-bg-base text-text-primary font-mono overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 h-14 border-b border-border flex items-center justify-between px-4 md:px-8 bg-bg-surface">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Exit</span>
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
            {/* Main Content Area - Centered when idle, top-aligned when showing content */}
            <main className="flex-1 overflow-y-auto min-h-0">
                <div className={`min-h-full flex flex-col items-center p-4 md:p-8 ${showDiagnose || simplifiedText || isSimplifying ? 'justify-start pt-8' : 'justify-center'}`}>
                    <div className="max-w-3xl w-full">
                        {/* Current Sentence - with subtle glow */}
                        <div
                            ref={sentenceContainerRef}
                            className="font-serif text-xl md:text-2xl leading-relaxed text-left p-6 md:p-8 border border-border bg-bg-surface select-text rounded-lg shadow-[0_0_30px_rgba(0,255,148,0.05)]"
                            onClick={(e) => {
                                const word = e.target.dataset?.word;
                                const keyWord = e.target.dataset?.keyWord;
                                if (word) onWordClick(word.toLowerCase(), currentSentence?.text || '', keyWord);
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
                                Looked up: {wordClicks.join(', ')}
                            </div>
                        )}

                        {/* Diagnose Mode */}
                        {showDiagnose && !simplifiedText && !isSimplifying && (
                            <div className="mt-6 p-4 border border-border bg-bg-surface rounded-lg">
                                <p className="text-center text-sm text-text-secondary mb-4">
                                    What's making this tricky?
                                </p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {DIFFICULTY_CHOICES.map(choice => (
                                        <button
                                            key={choice.id}
                                            onClick={() => onDifficultyChoice(choice.id)}
                                            className="px-4 py-3 border border-border hover:border-accent-primary hover:bg-accent-primary/10 transition-all text-center rounded-md"
                                        >
                                            <div className="text-lg">{choice.label}</div>
                                            <div className="text-xs text-text-muted">{choice.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}



                        {/* Simplified version */}
                        {(simplifiedText || isSimplifying) && (
                            <div className="mt-6 p-6 border border-accent-primary/30 bg-accent-primary/5 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-accent-primary" />
                                        <span className="text-xs text-accent-primary uppercase tracking-wider">
                                            {simplifyStage === 1 ? 'Simple Explanation' :
                                                simplifyStage === 2 ? 'Detailed Breakdown' :
                                                    '中文深度解释'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-text-muted">
                                        Stage {simplifyStage}/3
                                    </span>
                                </div>
                                <div className="font-serif text-base leading-relaxed text-accent-primary max-h-[40vh] overflow-y-auto custom-scrollbar">
                                    {simplifiedText ? (
                                        <ReactMarkdown components={markdownComponents}>
                                            {simplifiedText}
                                        </ReactMarkdown>
                                    ) : (
                                        isSimplifying && (
                                            <div className="flex items-center gap-2 py-4">
                                                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                <span className="ml-2 text-sm text-accent-primary/70 font-mono">Analyzing context...</span>
                                            </div>
                                        )
                                    )}
                                </div>
                                <div className="mt-6 flex flex-wrap justify-center gap-3">
                                    <button
                                        onClick={() => onSimplifiedResponse(true)}
                                        disabled={isSimplifying}
                                        className={`flex items-center justify-center gap-2 min-w-[140px] px-6 py-4 font-bold uppercase text-sm transition-all touch-manipulation rounded-md ${isSimplifying
                                            ? 'bg-accent-primary/30 text-black/50 cursor-not-allowed'
                                            : 'bg-accent-primary text-black hover:bg-accent-primary/80 active:scale-95'
                                            }`}
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        {simplifyStage === 3 ? '明白了!' : 'Got it!'}
                                    </button>
                                    <button
                                        onClick={() => onSimplifiedResponse(false)}
                                        disabled={isSimplifying}
                                        className={`flex items-center justify-center gap-2 min-w-[140px] px-6 py-4 border transition-all touch-manipulation rounded-md ${isSimplifying
                                            ? 'border-border text-text-muted cursor-not-allowed'
                                            : 'border-text-muted text-text-secondary hover:text-white hover:border-white active:scale-95'
                                            }`}
                                    >
                                        <HelpCircle className="w-5 h-5" />
                                        {simplifyStage < 3 ? 'Still Unclear' : '还是不懂'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Fixed Bottom Action Buttons */}
            {!showDiagnose && (
                <footer className="flex-shrink-0 p-4 md:p-6 border-t border-border bg-bg-surface">
                    <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-3">
                        <button
                            onClick={onClear}
                            className="flex items-center justify-center gap-2 min-w-[140px] px-8 py-4 bg-accent-primary text-black font-bold uppercase text-sm hover:bg-accent-primary/80 active:scale-95 transition-all touch-manipulation rounded-md"
                        >
                            <CheckCircle className="w-5 h-5" />
                            Clear
                        </button>
                        <button
                            onClick={onUnclear}
                            className="flex items-center justify-center gap-2 min-w-[140px] px-8 py-4 border border-text-muted text-text-secondary hover:text-white hover:border-white active:scale-95 transition-all touch-manipulation rounded-md"
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
