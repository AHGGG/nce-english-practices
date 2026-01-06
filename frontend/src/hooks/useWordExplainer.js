import { useState, useEffect, useRef, useCallback } from 'react';
import { parseTextSSEStream } from '../utils/sseParser';

/**
 * useWordExplainer - Shared hook for word/phrase explanation functionality
 * 
 * Used by both SentenceStudy and ReadingMode to provide:
 * - Dictionary lookup for single words
 * - Streaming LLM context explanation
 * - Progressive explanation styles (default -> simple -> chinese_deep)
 * - Phrase detection
 */
export function useWordExplainer() {
    // State
    const [selectedWord, setSelectedWord] = useState(null);
    const [isPhrase, setIsPhrase] = useState(false);
    const [inspectorData, setInspectorData] = useState(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [currentSentenceContext, setCurrentSentenceContext] = useState('');
    
    // Extra context for enhanced explanations (prev/next sentences)
    const [extraContext, setExtraContext] = useState({ prevSentence: null, nextSentence: null });
    
    // Streaming explanation state
    const [contextExplanation, setContextExplanation] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);
    const [explainStyle, setExplainStyle] = useState('default');
    
    // Request ID ref for cancelling stale streaming requests
    const explainRequestIdRef = useRef(0);

    // Fetch dictionary data when selectedWord changes (only for single words)
    useEffect(() => {
        const wordIsPhrase = selectedWord?.includes(' ') || false;
        
        if (!selectedWord || wordIsPhrase) {
            setInspectorData(null);
            setIsInspecting(false);
            return;
        }

        let cancelled = false;
        setIsInspecting(true);

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/dictionary/ldoce/${encodeURIComponent(selectedWord)}`);
                if (!cancelled && res.ok) {
                    const data = await res.json();
                    setInspectorData(data);
                }
            } catch (e) {
                console.error('Dictionary fetch error:', e);
            } finally {
                if (!cancelled) setIsInspecting(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [selectedWord]);

    // Stream context explanation when selectedWord changes
    useEffect(() => {
        if (!selectedWord || !currentSentenceContext) return;

        const currentRequestId = ++explainRequestIdRef.current;

        setIsExplaining(true);
        setContextExplanation('');

        const streamExplanation = async () => {
            try {
                const res = await fetch('/api/sentence-study/explain-word', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: selectedWord,
                        sentence: currentSentenceContext,
                        prev_sentence: extraContext.prevSentence,
                        next_sentence: extraContext.nextSentence,
                        style: explainStyle
                    })
                });

                if (explainRequestIdRef.current !== currentRequestId) return;
                if (!res.ok) throw new Error('Failed to fetch');

                await parseTextSSEStream(res, {
                    onText: (text) => {
                        if (explainRequestIdRef.current === currentRequestId) {
                            setContextExplanation(prev => prev + text);
                        }
                    },
                    onError: (err) => console.error('Stream error:', err)
                }, {
                    abortCheck: () => explainRequestIdRef.current !== currentRequestId
                });
            } catch (e) {
                console.error('Stream error:', e);
            } finally {
                if (explainRequestIdRef.current === currentRequestId) {
                    setIsExplaining(false);
                }
            }
        };

        streamExplanation();
    }, [selectedWord, currentSentenceContext, explainStyle, extraContext]);

    // Handle word/phrase click
    const handleWordClick = useCallback((word, sentence) => {
        if (!word) return;
        const cleanWord = word.toLowerCase().trim();
        if (cleanWord.length < 2) return;

        const hasMultipleWords = cleanWord.includes(' ');

        setIsPhrase(hasMultipleWords);
        setInspectorData(null);
        setCurrentSentenceContext(sentence || '');
        setContextExplanation('');
        setExplainStyle('default');
        setSelectedWord(cleanWord);
    }, []);

    // Close inspector
    const closeInspector = useCallback(() => {
        setSelectedWord(null);
        setInspectorData(null);
        setContextExplanation('');
        setIsPhrase(false);
    }, []);

    // Change explanation style (triggers re-fetch)
    const changeExplainStyle = useCallback((newStyle) => {
        setExplainStyle(newStyle);
        // Re-trigger explanation by incrementing request ID
        // The effect will re-run because explainStyle changed
    }, []);

    return {
        // State
        selectedWord,
        isPhrase,
        inspectorData,
        isInspecting,
        currentSentenceContext,
        contextExplanation,
        isExplaining,
        explainStyle,
        // Actions
        handleWordClick,
        closeInspector,
        changeExplainStyle,
        setCurrentSentenceContext,
        setExtraContext  // For SentenceStudy's prev/next sentence context
    };
}

export default useWordExplainer;
