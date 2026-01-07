import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Get difficulty type label and color
const getDifficultyInfo = (unclearChoice) => {
    switch (unclearChoice) {
        case 'vocabulary':
            return { label: 'Words', color: 'text-orange-400 border-orange-400', bg: 'bg-orange-500/10' };
        case 'grammar':
            return { label: 'Structure', color: 'text-blue-400 border-blue-400', bg: 'bg-blue-500/10' };
        case 'meaning':
            return { label: 'Context', color: 'text-amber-400 border-amber-400', bg: 'bg-amber-500/10' };
        case 'both':
            return { label: 'Everything', color: 'text-red-400 border-red-400', bg: 'bg-red-500/10' };
        default:
            return { label: 'Unclear', color: 'text-yellow-400 border-yellow-400', bg: 'bg-yellow-500/10' };
    }
};

// Markdown components for styled rendering
const markdownComponents = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="pl-1 marker:text-[#00FF94]">{children}</li>,
    strong: ({ children }) => <strong className="text-[#00FF94] font-bold">{children}</strong>,
    em: ({ children }) => <em className="text-[#FFD700] not-italic">{children}</em>,
    code: ({ children }) => <code className="bg-[#1A1A1A] px-1 rounded text-[#00FF94] font-mono text-xs">{children}</code>,
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-white">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>,
};

/**
 * Sentence Inspector Panel - Shows sentence explanation for unclear sentences
 * Called simplify API to get progressive explanations (Stage 1/2/3)
 */
const SentenceInspector = ({
    sentence,           // The sentence text
    unclearInfo,        // { sentence_index, unclear_choice, max_simplify_stage }
    onClose,
    isOpen = false
}) => {
    const [currentStage, setCurrentStage] = useState(1);
    const [explanations, setExplanations] = useState({}); // { 1: "...", 2: "...", 3: "..." }
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);

    // Fetch explanation for current stage
    const fetchExplanation = async (stage) => {
        if (explanations[stage]) return; // Already cached

        setIsLoading(true);
        setError(null);

        // Abort previous request if any
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/sentence-study/simplify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sentence: sentence,
                    simplify_type: unclearInfo?.unclear_choice || 'both',
                    stage: stage
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error('Failed to fetch explanation');

            // SSE streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk') {
                                accumulated += data.content;
                                setExplanations(prev => ({ ...prev, [stage]: accumulated }));
                            } else if (data.type === 'done') {
                                // Streaming complete
                            } else if (data.type === 'error') {
                                setError(data.message);
                            }
                        } catch (e) {
                            // Ignore parse errors for incomplete chunks
                        }
                    }
                }
            }
        } catch (e) {
            if (e.name !== 'AbortError') {
                setError(e.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch explanation when opened or stage changes
    useEffect(() => {
        if (isOpen && sentence) {
            fetchExplanation(currentStage);
        }
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [isOpen, sentence, currentStage]);

    // Reset when sentence changes
    useEffect(() => {
        setExplanations({});
        setCurrentStage(1);
        setError(null);
    }, [sentence]);

    if (!isOpen || !sentence) return null;

    const difficultyInfo = getDifficultyInfo(unclearInfo?.unclear_choice);
    const stageLabels = {
        1: 'Simple Explanation',
        2: 'Detailed Breakdown',
        3: '中文深度解释'
    };

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col justify-end md:justify-center md:items-end md:pr-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 md:bg-black/50 pointer-events-auto"
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div className="pointer-events-auto relative w-full md:w-[480px] bg-[#0A0A0A] border-t md:border border-[#333] md:shadow-[4px_4px_0px_0px_rgba(0,255,148,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-[#333] bg-[#111] shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className={`w-4 h-4 ${difficultyInfo.color.split(' ')[0]}`} />
                            <span className={`text-xs font-mono uppercase tracking-wider ${difficultyInfo.color.split(' ')[0]}`}>
                                {difficultyInfo.label} Issue
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center border border-[#333] text-[#666] hover:border-[#FF0055] hover:text-[#FF0055] transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Sentence preview */}
                    <p className="text-sm text-[#CCC] font-serif leading-relaxed line-clamp-3">
                        {sentence}
                    </p>
                </div>

                {/* Stage Tabs */}
                <div className="flex border-b border-[#333] bg-[#0A0A0A] shrink-0">
                    {[1, 2, 3].map(stage => (
                        <button
                            key={stage}
                            onClick={() => setCurrentStage(stage)}
                            className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${currentStage === stage
                                ? 'text-[#00FF94] border-b-2 border-[#00FF94] bg-[#00FF94]/5'
                                : 'text-[#666] hover:text-[#888]'
                                }`}
                        >
                            Stage {stage}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {/* Stage Label */}
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-[#00FF94]" />
                        <span className="text-xs text-[#00FF94] uppercase tracking-wider font-mono">
                            {stageLabels[currentStage]}
                        </span>
                        {isLoading && (
                            <Loader2 className="w-3 h-3 animate-spin text-[#00FF94] ml-auto" />
                        )}
                    </div>

                    {/* Explanation Content */}
                    <div className="text-sm text-[#CCC] leading-relaxed font-serif">
                        {error ? (
                            <div className="text-[#FF0055] text-center py-4">
                                {error}
                            </div>
                        ) : explanations[currentStage] ? (
                            <ReactMarkdown components={markdownComponents}>
                                {explanations[currentStage]}
                            </ReactMarkdown>
                        ) : isLoading ? (
                            <div className="flex items-center justify-center py-8 text-[#666]">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span className="text-xs uppercase tracking-wider font-mono">Generating explanation...</span>
                            </div>
                        ) : (
                            <div className="text-[#666] text-center py-4">
                                Click a stage to load explanation
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#333] bg-[#111] shrink-0">
                    {currentStage < 3 && (
                        <button
                            onClick={() => setCurrentStage(prev => Math.min(prev + 1, 3))}
                            className="w-full py-3 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 border border-[#333] text-[#888] hover:text-[#00FF94] hover:border-[#00FF94] transition-colors"
                        >
                            <span>Still unclear? Go deeper</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                    {currentStage === 3 && (
                        <div className="text-center text-xs text-[#666] font-mono">
                            This is the deepest level of explanation
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SentenceInspector;
