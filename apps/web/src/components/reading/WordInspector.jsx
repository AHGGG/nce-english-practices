import React, { useState, useMemo } from 'react';
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
    currentStyle = 'default',   // default, simple, chinese_deep
    // Image generation props
    generatedImage = null,
    isGeneratingImage = false,
    canGenerateImage = false,
    onGenerateImage = () => {}
}) => {
    // Derive default tab from inspectorData (memoized to avoid recalculation)
    const defaultTab = useMemo(() => {
        if (inspectorData?.ldoce?.found) return 'LDOCE';
        if (inspectorData?.collins?.found) return 'Collins';
        return 'LDOCE';
    }, [inspectorData]);

    const [activeTab, setActiveTab] = useState(defaultTab);

    // Update tab when data changes (but only if current tab is invalid)
    const effectiveTab = useMemo(() => {
        if (activeTab === 'LDOCE' && inspectorData?.ldoce?.found) return 'LDOCE';
        if (activeTab === 'Collins' && inspectorData?.collins?.found) return 'Collins';
        return defaultTab;
    }, [activeTab, inspectorData, defaultTab]);

    if (!selectedWord) return null;

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col justify-end md:justify-center md:items-end md:pr-8">
            {/* Backdrop for mobile only */}
            <div
                className="absolute inset-0 bg-bg-base/80 md:bg-bg-base/50 pointer-events-auto"
                onClick={onClose}
            ></div>

            {/* Card - Sharp Industrial Style */}
            <div className="pointer-events-auto relative w-full md:w-[420px] bg-bg-surface border-t md:border border-border md:shadow-[4px_4px_0px_0px_rgba(0,255,148,0.2)] overflow-hidden flex flex-col max-h-[80vh] md:max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between bg-bg-elevated shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-serif font-bold text-text-primary">{selectedWord}</span>
                        <button
                            onClick={() => onPlayAudio(selectedWord)}
                            className="w-8 h-8 flex items-center justify-center border border-border text-accent-primary hover:bg-accent-primary hover:text-text-inverse transition-colors"
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center border border-border text-text-muted hover:border-accent-danger hover:text-accent-danger transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content - Using DictionaryResults */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Streaming Context Explanation Section */}
                    {(contextExplanation || isExplaining) && (
                        <div className="m-4 mb-4 p-3 border border-accent-primary/30 bg-accent-primary/5 rounded">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-accent-primary" />
                                <span className="text-xs text-accent-primary uppercase tracking-wider font-mono">
                                    {isPhrase ? 'Phrase Explanation' : 'In This Context'}
                                </span>
                                {isExplaining && (
                                    <Loader2 className="w-3 h-3 animate-spin text-accent-primary ml-auto" />
                                )}
                            </div>
                            <div className="text-sm text-text-primary leading-relaxed font-serif">
                                {contextExplanation ? (
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                            h2: ({ children }) => <h2 className="text-sm font-bold text-accent-primary uppercase tracking-wider mt-3 mb-1 first:mt-0">{children}</h2>,
                                            h3: ({ children }) => <h3 className="text-xs font-bold text-accent-warning uppercase tracking-wider mt-2 mb-1">{children}</h3>,
                                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                                            li: ({ children }) => <li className="pl-1 marker:text-accent-primary">{children}</li>,
                                            strong: ({ children }) => <strong className="text-accent-primary font-bold">{children}</strong>,
                                            em: ({ children }) => <em className="text-accent-warning not-italic">{children}</em>,
                                            code: ({ children }) => <code className="bg-bg-elevated px-1 rounded text-accent-primary font-mono text-xs">{children}</code>
                                        }}
                                    >
                                        {contextExplanation}
                                    </ReactMarkdown>
                                ) : 'Analyzing...'}
                            </div>

                            {/* Generated Image Section */}
                            {(isGeneratingImage || generatedImage || canGenerateImage) && (
                                <div className="mt-4 border-t border-accent-primary/20 pt-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-3 h-3 text-accent-warning" />
                                        <span className="text-xs text-accent-warning uppercase tracking-wider font-mono">
                                            AI Visualization
                                        </span>
                                    </div>

                                    {isGeneratingImage ? (
                                        <div className="flex flex-col items-center justify-center py-4 bg-bg-base/20 rounded">
                                            <Loader2 className="w-5 h-5 animate-spin text-accent-warning mb-2" />
                                            <span className="text-[10px] text-text-muted uppercase font-mono tracking-widest">Generating Image...</span>
                                        </div>
                                    ) : generatedImage ? (
                                        <div className="relative group overflow-hidden rounded border border-border">
                                            <img
                                                src={generatedImage}
                                                alt={`AI visualization for ${selectedWord}`}
                                                className="w-full h-auto object-cover max-h-[200px]"
                                            />
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={onGenerateImage}
                                            className="w-full py-2 bg-accent-warning/10 border border-accent-warning/30 text-accent-warning hover:bg-accent-warning/20 transition-colors rounded text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Generate Visualization
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Progressive Actions */}
                            {!isExplaining && contextExplanation && (
                                <div className="mt-3 flex gap-2 border-t border-accent-primary/20 pt-2">
                                    {currentStyle !== 'simple' && (
                                        <button
                                            onClick={() => onExplainStyle('simple')}
                                            className="flex-1 py-1.5 text-xs font-mono text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/10 transition-colors uppercase flex items-center justify-center gap-1"
                                        >
                                            <span>Simpler please</span>
                                        </button>
                                    )}
                                    {currentStyle !== 'chinese_deep' && (
                                        <button
                                            onClick={() => onExplainStyle('chinese_deep')}
                                            className="flex-1 py-1.5 text-xs font-mono text-accent-warning border border-accent-warning/30 hover:bg-accent-warning/10 transition-colors uppercase flex items-center justify-center gap-1"
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
                            <div className="flex flex-col items-center justify-center p-8 text-text-muted space-y-3">
                                <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
                                <span className="text-xs uppercase tracking-widest font-mono">Consulting Dictionary...</span>
                            </div>
                        ) : inspectorData?.found ? (
                            <div className="flex flex-col h-full">
                                {/* Dictionary Tabs */}
                                <div className="flex border-b border-border bg-bg-surface shrink-0 z-10 sticky top-0">
                                    {inspectorData.ldoce?.found && (
                                        <button
                                            onClick={() => setActiveTab('LDOCE')}
                                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${effectiveTab === 'LDOCE'
                                                ? 'text-accent-primary border-b-2 border-accent-primary bg-accent-primary/5'
                                                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                                }`}
                                        >
                                            LDOCE
                                        </button>
                                    )}
                                    {inspectorData.collins?.found && (
                                        <button
                                            onClick={() => setActiveTab('Collins')}
                                            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${effectiveTab === 'Collins'
                                                ? 'text-accent-warning border-b-2 border-accent-warning bg-accent-warning/5'
                                                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                                                }`}
                                        >
                                            Collins
                                        </button>
                                    )}
                                </div>

                                {/* Results */}
                                <div className="flex-1 p-4 mt-2">
                                    {effectiveTab === 'LDOCE' && inspectorData.ldoce?.found && (
                                        <DictionaryResults
                                            word={selectedWord}
                                            source="LDOCE"
                                            entries={inspectorData.ldoce.entries}
                                        />
                                    )}
                                    {effectiveTab === 'Collins' && inspectorData.collins?.found && (
                                        <DictionaryResults
                                            word={selectedWord}
                                            source="Collins"
                                            entries={inspectorData.collins.entry ? [inspectorData.collins.entry] : []}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : inspectorData?.found === false ? (
                            <div className="text-text-secondary text-center p-8">
                                <p className="text-lg mb-2 font-serif">Word not found</p>
                                <p className="text-sm font-mono">"{selectedWord}" is not in dictionaries.</p>
                            </div>
                        ) : (
                            <div className="text-accent-danger text-center text-sm p-8 font-mono">Failed to load definition</div>
                        )}
                    </>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-bg-elevated shrink-0 flex gap-2">
                    <button
                        onClick={() => onMarkAsKnown(selectedWord)}
                        className="flex-1 bg-bg-elevated border border-border text-text-secondary py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-border hover:text-text-primary transition-all active:translate-y-[1px]"
                    >
                        Mark Known
                    </button>
                    <button className="flex-[2] bg-text-primary text-text-inverse py-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-light-surface hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] transition-all active:translate-y-[1px]">
                        <Bookmark className="w-4 h-4" />
                        Add to Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WordInspector;

