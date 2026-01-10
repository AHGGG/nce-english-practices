import React from 'react';
import { Volume2, X, Bookmark, Loader2, Sparkles } from 'lucide-react';
import DictionaryResults from '../aui/DictionaryResults';
import ReactMarkdown from 'react-markdown';

/**
 * Word Inspector Panel - Shows dictionary definition for selected word
 * Optionally shows streaming LLM context explanation
 */
const WordInspector = ({
    selectedWord,
    inspectorData,
    isInspecting,
    onClose,
    onPlayAudio,
    onMarkAsKnown,
    // New props for streaming context explanation
    contextExplanation = '',
    isExplaining = false,
    isPhrase = false,  // True when showing a phrase instead of a single word
    onExplainStyle = () => { }, // Handle style change request
    currentStyle = 'default'   // default, simple, chinese_deep
}) => {
    if (!selectedWord) return null;

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col justify-end md:justify-center md:items-end md:pr-8">
            {/* Backdrop for mobile only */}
            <div
                className="absolute inset-0 bg-black/80 md:bg-black/50 pointer-events-auto"
                onClick={onClose}
            ></div>

            {/* Card - Sharp Industrial Style */}
            <div className="pointer-events-auto relative w-full md:w-[420px] bg-[#0A0A0A] border-t md:border border-[#333] md:shadow-[4px_4px_0px_0px_rgba(0,255,148,0.2)] overflow-hidden flex flex-col max-h-[80vh] md:max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#111] shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-serif font-bold text-white">{selectedWord}</span>
                        <button
                            onClick={() => onPlayAudio(selectedWord)}
                            className="w-8 h-8 flex items-center justify-center border border-[#333] text-[#00FF94] hover:bg-[#00FF94] hover:text-black transition-colors"
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center border border-[#333] text-[#666] hover:border-[#FF0055] hover:text-[#FF0055] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content - Using DictionaryResults */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {/* Streaming Context Explanation Section */}
                    {(contextExplanation || isExplaining) && (
                        <div className="mb-4 p-3 border border-[#00FF94]/30 bg-[#00FF94]/5 rounded">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-[#00FF94]" />
                                <span className="text-xs text-[#00FF94] uppercase tracking-wider font-mono">
                                    {isPhrase ? 'Phrase Explanation' : 'In This Context'}
                                </span>
                                {isExplaining && (
                                    <Loader2 className="w-3 h-3 animate-spin text-[#00FF94] ml-auto" />
                                )}
                            </div>
                            <div className="text-sm text-[#CCC] leading-relaxed font-serif">
                                {contextExplanation ? (
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                            h2: ({ children }) => <h2 className="text-sm font-bold text-[#00FF94] uppercase tracking-wider mt-3 mb-1 first:mt-0">{children}</h2>,
                                            h3: ({ children }) => <h3 className="text-xs font-bold text-[#FFD700] uppercase tracking-wider mt-2 mb-1">{children}</h3>,
                                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                            li: ({ children }) => <li className="pl-1 marker:text-[#00FF94]">{children}</li>,
                                            strong: ({ children }) => <strong className="text-[#00FF94] font-bold">{children}</strong>,
                                            em: ({ children }) => <em className="text-[#FFD700] not-italic">{children}</em>,
                                            code: ({ children }) => <code className="bg-[#1A1A1A] px-1 rounded text-[#00FF94] font-mono text-xs">{children}</code>
                                        }}
                                    >
                                        {contextExplanation}
                                    </ReactMarkdown>
                                ) : 'Analyzing...'}
                            </div>

                            {/* Progressive Actions */}
                            {!isExplaining && contextExplanation && (
                                <div className="mt-3 flex gap-2 border-t border-[#00FF94]/20 pt-2">
                                    {currentStyle !== 'simple' && (
                                        <button
                                            onClick={() => onExplainStyle('simple')}
                                            className="flex-1 py-1.5 text-xs font-mono text-[#00FF94] border border-[#00FF94]/30 hover:bg-[#00FF94]/10 transition-colors uppercase flex items-center justify-center gap-1"
                                        >
                                            <span>Simpler please</span>
                                        </button>
                                    )}
                                    {currentStyle !== 'chinese_deep' && (
                                        <button
                                            onClick={() => onExplainStyle('chinese_deep')}
                                            className="flex-1 py-1.5 text-xs font-mono text-[#FFD700] border border-[#FFD700]/30 hover:bg-[#FFD700]/10 transition-colors uppercase flex items-center justify-center gap-1"
                                        >
                                            <span>🇨🇳 Chinese Deep Dive</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Dictionary section - show for both single words and phrases */}
                    <>
                        {isInspecting ? (
                            <div className="flex flex-col items-center justify-center py-8 text-[#666] space-y-3">
                                <Loader2 className="w-6 h-6 animate-spin text-[#00FF94]" />
                                <span className="text-xs uppercase tracking-widest font-mono">Consulting Dictionary...</span>
                            </div>
                        ) : inspectorData?.found && inspectorData?.entries?.length > 0 ? (
                            <DictionaryResults
                                word={selectedWord}
                                source="LDOCE"
                                entries={inspectorData.entries}
                            />
                        ) : inspectorData?.found === false ? (
                            <div className="text-[#888] text-center py-8">
                                <p className="text-lg mb-2 font-serif">Word not found</p>
                                <p className="text-sm font-mono">"{selectedWord}" is not in LDOCE dictionary.</p>
                            </div>
                        ) : (
                            <div className="text-[#FF0055] text-center text-sm py-8 font-mono">Failed to load definition</div>
                        )}
                    </>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-[#333] bg-[#111] shrink-0 flex gap-2">
                    <button
                        onClick={() => onMarkAsKnown(selectedWord)}
                        className="flex-1 bg-[#1A1A1A] border border-[#333] text-[#888] py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#222] hover:text-white transition-all active:translate-y-[1px]"
                    >
                        Mark Known
                    </button>
                    <button className="flex-[2] bg-[#E0E0E0] text-black py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] transition-all active:translate-y-[1px]">
                        <Bookmark className="w-4 h-4" />
                        Add to Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WordInspector;

