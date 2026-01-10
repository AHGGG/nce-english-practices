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
    const [lookupWord, setLookupWord] = useState(null); // The word to actually look up in dictionary
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

    // Fetch dictionary data when lookupWord changes
    useEffect(() => {
        if (!lookupWord) {
            setInspectorData(null);
            setIsInspecting(false);
            return;
        }

        let cancelled = false;
        setIsInspecting(true);

        const fetchData = async () => {
            try {
                // 1. Try initial lookup (either keyWord or full phrase)
                let res = await fetch(`/api/dictionary/ldoce/${encodeURIComponent(lookupWord)}`);
                let data = null;
                
                if (!cancelled && res.ok) {
                    data = await res.json();
                }

                // 2. Heuristic Fallback: If not found and it's a phrase, try to find a key word
                if ((!data || !data.found) && lookupWord.includes(' ')) {
                    // Split phrase and filter stop words
                    const stopWords = new Set(['of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'is', 'are']);
                    const tokens = lookupWord.split(/[^a-zA-Z0-9-]/).filter(t => t && t.length > 2);
                    const candidates = tokens.filter(t => !stopWords.has(t.toLowerCase()));
                    
                    // Sort by length descending (longest words are usually most significant)
                    candidates.sort((a, b) => b.length - a.length);
                    
                    if (candidates.length > 0) {
                        const fallbackWord = candidates[0];
                        
                        const fallbackRes = await fetch(`/api/dictionary/ldoce/${encodeURIComponent(fallbackWord)}`);
                        if (!cancelled && fallbackRes.ok) {
                            const fallbackData = await fallbackRes.json();
                            if (fallbackData.found) {
                                data = fallbackData;
                            }
                        }
                    }
                }

                if (!cancelled && data) {
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
    }, [lookupWord]);

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
    const handleWordClick = useCallback((word, sentence, keyWord) => {
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
        
        // If a specific key word was provided (from backend collocation detection), use it
        // Otherwise use the clicked word/phrase itself
        const wordToLookup = keyWord && keyWord.trim() ? keyWord.toLowerCase().trim() : cleanWord;
        setLookupWord(wordToLookup);
        
    }, []);

    // Close inspector
    const closeInspector = useCallback(() => {
        setSelectedWord(null);
        setLookupWord(null);
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
