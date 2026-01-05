/**
 * StudyingView - Main sentence-by-sentence study interface
 * Shows current sentence with Clear/Unclear buttons and simplification flow
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, CheckCircle, HelpCircle, Loader2, Sparkles } from 'lucide-react';
import MemoizedSentence from '../../reading/MemoizedSentence';
import { DIFFICULTY_CHOICES } from '../constants';

// Markdown components for styled rendering
const markdownComponents = {
    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
    em: ({ children }) => <em className="text-[#FFD700] not-italic">{children}</em>,
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
        <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono">
            {/* Header */}
            <header className="h-14 border-b border-[#333] flex items-center justify-between px-4 md:px-8 bg-[#0A0A0A]">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#888] hover:text-[#00FF94] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Exit</span>
                </button>

                <div className="text-xs text-[#666]">
                    {currentIndex + 1} / {totalSentences}
                </div>
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-[#1A1A1A]">
                <div
                    className="h-full bg-[#00FF94] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
                <div className="max-w-2xl w-full">
                    {/* Current Sentence */}
                    <div
                        ref={sentenceContainerRef}
                        className="font-serif text-xl md:text-2xl leading-relaxed text-center mb-8 p-6 border border-[#333] bg-[#0A0A0A] select-text"
                        onClick={(e) => {
                            const word = e.target.dataset?.word;
                            if (word) onWordClick(word.toLowerCase(), currentSentence?.text || '');
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
                            <span className="text-[#666]">No sentence available</span>
                        )}
                    </div>

                    {/* Word clicks indicator */}
                    {wordClicks.length > 0 && (
                        <div className="text-center text-xs text-[#666] mb-4">
                            Looked up: {wordClicks.join(', ')}
                        </div>
                    )}

                    {/* Diagnose Mode */}
                    {showDiagnose && !simplifiedText && !isSimplifying && (
                        <div className="mb-8 p-4 border border-[#444] bg-[#0A0A0A]">
                            <p className="text-center text-sm text-[#888] mb-4">
                                What's making this tricky?
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {DIFFICULTY_CHOICES.map(choice => (
                                    <button
                                        key={choice.id}
                                        onClick={() => onDifficultyChoice(choice.id)}
                                        className="px-4 py-3 border border-[#333] hover:border-[#00FF94] hover:bg-[#00FF94]/10 transition-all text-center"
                                    >
                                        <div className="text-lg">{choice.label}</div>
                                        <div className="text-xs text-[#666]">{choice.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading simplified version */}
                    {isSimplifying && (
                        <div className="mb-8 p-6 border border-[#00FF94]/30 bg-[#00FF94]/5 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#00FF94] mx-auto mb-2" />
                            <p className="text-sm text-[#888]">Generating simplified version...</p>
                        </div>
                    )}

                    {/* Simplified version */}
                    {simplifiedText && (
                        <div className="mb-8 p-6 border border-[#00FF94]/30 bg-[#00FF94]/5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[#00FF94]" />
                                    <span className="text-xs text-[#00FF94] uppercase tracking-wider">
                                        {simplifyStage === 1 ? 'Simple Explanation' :
                                            simplifyStage === 2 ? 'Detailed Breakdown' :
                                                '中文深度解释'}
                                    </span>
                                </div>
                                <span className="text-xs text-[#666]">
                                    Stage {simplifyStage}/3
                                </span>
                            </div>
                            <div className="font-serif text-base leading-relaxed text-[#00FF94] max-h-[40vh] overflow-y-auto custom-scrollbar">
                                <ReactMarkdown components={markdownComponents}>
                                    {simplifiedText}
                                </ReactMarkdown>
                            </div>
                            <div className="mt-6 flex flex-wrap justify-center gap-3">
                                <button
                                    onClick={() => onSimplifiedResponse(true)}
                                    className="flex items-center justify-center gap-2 min-w-[140px] px-6 py-4 bg-[#00FF94] text-black font-bold uppercase text-sm hover:bg-[#00CC77] active:scale-95 transition-all touch-manipulation"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    {simplifyStage === 3 ? '明白了!' : 'Got it!'}
                                </button>
                                <button
                                    onClick={() => onSimplifiedResponse(false)}
                                    className="flex items-center justify-center gap-2 min-w-[140px] px-6 py-4 border border-[#666] text-[#888] hover:text-white hover:border-white active:scale-95 transition-all touch-manipulation"
                                >
                                    <HelpCircle className="w-5 h-5" />
                                    {simplifyStage < 3 ? 'Still Unclear' : '还是不懂'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Main action buttons (when not in diagnose mode) */}
                    {!showDiagnose && (
                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                onClick={onClear}
                                className="flex items-center justify-center gap-2 min-w-[140px] px-8 py-4 bg-[#00FF94] text-black font-bold uppercase text-sm hover:bg-[#00CC77] active:scale-95 transition-all touch-manipulation"
                            >
                                <CheckCircle className="w-5 h-5" />
                                Clear
                            </button>
                            <button
                                onClick={onUnclear}
                                className="flex items-center justify-center gap-2 min-w-[140px] px-8 py-4 border border-[#666] text-[#888] hover:text-white hover:border-white active:scale-95 transition-all touch-manipulation"
                            >
                                <HelpCircle className="w-5 h-5" />
                                Unclear
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudyingView;
