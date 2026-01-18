import { useState, useEffect, useRef, useCallback } from 'react';
import { parseJSONSSEStream } from '../utils/sseParser';
import { authFetch } from '../api/auth';

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
    const [generatedImage, setGeneratedImage] = useState(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
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

        const fetchBothDictionaries = async (word) => {
            const [ldoceRes, collinsRes] = await Promise.all([
                authFetch(`/api/dictionary/ldoce/${encodeURIComponent(word)}`),
                authFetch(`/api/dictionary/collins/${encodeURIComponent(word)}`)
            ]);

            const ldoceData = ldoceRes.ok ? await ldoceRes.json() : null;
            const collinsData = collinsRes.ok ? await collinsRes.json() : null;

            return {
                word,
                ldoce: ldoceData,
                collins: collinsData,
                found: (ldoceData?.found || collinsData?.found)
            };
        };

        const fetchData = async () => {
            try {
                // 1. Try initial lookup (either keyWord or full phrase)
                let combinedData = await fetchBothDictionaries(lookupWord);

                // 2. Heuristic Fallback: If not found and it's a phrase, try to find a key word
                if (!combinedData.found && lookupWord.includes(' ')) {
                    // Split phrase and filter stop words
                    const stopWords = new Set([
                        'of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
                        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
                        'that', 'this', 'these', 'those', 'there', 'here',
                        'not', 'no', 'but', 'if', 'so', 'as', 'when', 'where', 'why', 'how',
                        'up', 'down', 'out', 'back', 'about', 'into', 'over', 'after', 'off', 'away', 'from',
                        'one', 'two', 'three', 'first', 'second', 'third',
                        'get', 'got', 'make', 'made', 'go', 'went', 'take', 'took', 'come', 'came', 'see', 'saw', 'know', 'knew', 'think', 'thought',
                        'look', 'looked', 'want', 'wanted', 'give', 'gave', 'use', 'used', 'find', 'found', 'tell', 'told', 'ask', 'asked', 'work', 'worked',
                        'seem', 'seemed', 'feel', 'felt', 'try', 'tried', 'leave', 'left', 'call', 'called'
                    ]);
                    const tokens = lookupWord.split(/[^a-zA-Z0-9-]/).filter(t => t && t.length > 2);
                    const candidates = tokens.filter(t => !stopWords.has(t.toLowerCase()));
                    
                    // Sort by length descending (longest words are usually most significant)
                    candidates.sort((a, b) => b.length - a.length);
                    
                    if (candidates.length > 0) {
                        const fallbackWord = candidates[0];
                        const fallbackData = await fetchBothDictionaries(fallbackWord);
                        
                        if (fallbackData.found) {
                            combinedData = fallbackData;
                        }
                    }
                }

                if (!cancelled) {
                    setInspectorData(combinedData);
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
                const res = await authFetch('/api/sentence-study/explain-word', {
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

                await parseJSONSSEStream(res, {
                    onChunk: (text) => {
                        if (explainRequestIdRef.current === currentRequestId) {
                            setContextExplanation(prev => prev + text);
                        }
                    },
                    onEvent: async (type, data) => {
                        console.log('[useWordExplainer] SSE Event:', type, data);
                        if (type === 'image_check' && explainRequestIdRef.current === currentRequestId) {
                            // If suitable for image, trigger generation
                            if (data.suitable && data.image_prompt) {
                                console.log('[useWordExplainer] Image suitable, generating...');
                                setIsGeneratingImage(true);
                                try {
                                    const genRes = await authFetch('/api/generated-images/generate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            word: selectedWord,
                                            sentence: currentSentenceContext,
                                            image_prompt: data.image_prompt
                                        })
                                    });
                                    
                                    if (genRes.ok) {
                                        const genData = await genRes.json();
                                        console.log('[useWordExplainer] Image URL received:', genData.image_url);
                                        if (explainRequestIdRef.current === currentRequestId) {
                                            setGeneratedImage(genData.image_url);
                                        }
                                    } else {
                                        console.error('[useWordExplainer] Generate API failed:', genRes.status);
                                    }
                                } catch (e) {
                                    console.error('[useWordExplainer] Image generation failed', e);
                                } finally {
                                    if (explainRequestIdRef.current === currentRequestId) {
                                        setIsGeneratingImage(false);
                                    }
                                }
                            }
                        }
                    },
                    onError: (err) => console.error('Stream error:', err)
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
        setGeneratedImage(null);
        setIsGeneratingImage(false);
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
        setGeneratedImage(null);
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
        generatedImage,
        isGeneratingImage,
        // Actions
        handleWordClick,
        closeInspector,
        changeExplainStyle,
        setCurrentSentenceContext,
        setExtraContext  // For SentenceStudy's prev/next sentence context
    };
}

export default useWordExplainer;
