import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getGapTypeInfo } from '../sentence-study/constants';
import { authFetch } from '../../api/auth';

// Get difficulty type label and color


// Markdown components for styled rendering
const markdownComponents = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
    li: ({ children }) => <li className="pl-1 marker:text-accent-primary">{children}</li>,
    strong: ({ children }) => <strong className="text-accent-primary font-bold">{children}</strong>,
    em: ({ children }) => <em className="text-accent-warning not-italic">{children}</em>,
    code: ({ children }) => <code className="bg-bg-elevated px-1 rounded text-accent-primary font-mono text-xs">{children}</code>,
    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-text-primary">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-text-primary">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-bold mb-2 text-text-primary">{children}</h3>,
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
            const response = await authFetch('/api/sentence-study/simplify', {
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
                        } catch {
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

    const difficultyInfo = getGapTypeInfo(unclearInfo?.unclear_choice);
    const stageLabels = {
        1: 'Simple Explanation',
        2: 'Detailed Breakdown',
        3: '中文深度解释'
    };

    return (
        <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col justify-end md:justify-center md:items-end md:pr-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-bg-base/80 md:bg-bg-base/50 pointer-events-auto"
                onClick={onClose}
            ></div>

            {/* Panel */}
            <div className="pointer-events-auto relative w-full md:w-[480px] bg-bg-surface border-t md:border border-border md:shadow-[4px_4px_0px_0px_rgba(0,255,148,0.2)] overflow-hidden flex flex-col h-[85dvh] lg:h-auto lg:max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-border bg-bg-elevated shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className={`w-4 h-4 ${difficultyInfo.cssClasses.text}`} />
                            <span className={`text-xs font-mono uppercase tracking-wider ${difficultyInfo.cssClasses.text}`}>
                                {difficultyInfo.shortLabel} Issue
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center border border-border text-text-muted hover:border-accent-danger hover:text-accent-danger transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Sentence preview */}
                    <p className="text-sm text-text-primary font-serif leading-relaxed line-clamp-3">
                        {sentence}
                    </p>
                </div>

                {/* Stage Tabs */}
                <div className="flex border-b border-border bg-bg-surface shrink-0">
                    {[1, 2, 3].map(stage => (
                        <button
                            key={stage}
                            onClick={() => setCurrentStage(stage)}
                            className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${currentStage === stage
                                ? 'text-accent-primary border-b-2 border-accent-primary bg-accent-primary/5'
                                : 'text-text-muted hover:text-text-secondary'
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
                        <Sparkles className="w-4 h-4 text-accent-primary" />
                        <span className="text-xs text-accent-primary uppercase tracking-wider font-mono">
                            {stageLabels[currentStage]}
                        </span>
                        {isLoading && (
                            <Loader2 className="w-3 h-3 animate-spin text-accent-primary ml-auto" />
                        )}
                    </div>

                    {/* Explanation Content */}
                    <div className="text-sm text-text-primary leading-relaxed font-serif">
                        {error ? (
                            <div className="text-accent-danger text-center py-4">
                                {error}
                            </div>
                        ) : explanations[currentStage] ? (
                            <ReactMarkdown components={markdownComponents}>
                                {explanations[currentStage]}
                            </ReactMarkdown>
                        ) : isLoading ? (
                            <div className="flex items-center justify-center py-8 text-text-muted">
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                <span className="text-xs uppercase tracking-wider font-mono">Generating explanation...</span>
                            </div>
                        ) : (
                            <div className="text-text-muted text-center py-4">
                                Click a stage to load explanation
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-bg-elevated shrink-0">
                    {currentStage < 3 && (
                        <button
                            onClick={() => setCurrentStage(prev => Math.min(prev + 1, 3))}
                            className="w-full py-3 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 border border-border text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-colors"
                        >
                            <span>Still unclear? Go deeper</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                    {currentStage === 3 && (
                        <div className="text-center text-xs text-text-muted font-mono">
                            This is the deepest level of explanation
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SentenceInspector;
