import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReadingTracker from '../../utils/ReadingTracker';
import ArticleListView from './ArticleListView';
import ReaderView from './ReaderView';
import WordInspector from './WordInspector';
import Lightbox from './Lightbox';
import { HIGHLIGHT_OPTIONS, BATCH_SIZE, mapLevelToOptionIndex } from './constants';

// Simple API helper for ReadingTracker
const api = {
    post: async (url, data) => {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    put: async (url, data) => {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    }
};

/**
 * Reading Mode - Premium Article Reader
 * Features:
 * - Immersive Reading Environment (Serif, Dark Mode)
 * - Vocabulary Highlighting (COCA, CET-4, etc.)
 * - Rich Word Inspector (Definition, Audio, Context)
 * - Source Awareness (where did I learn this?)
 */
const ReadingMode = () => {
    // --- State ---
    const [articles, setArticles] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Settings
    const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
    const [showHighlights, setShowHighlights] = useState(true);

    // Inspection
    const [selectedWord, setSelectedWord] = useState(null);
    const [inspectorData, setInspectorData] = useState(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [currentContext, setCurrentContext] = useState('');

    // Progressive loading
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

    // Audio
    const audioRef = useRef(null);

    // Lightbox
    const [lightboxImage, setLightboxImage] = useState(null);

    // Reading session tracking
    const trackerRef = useRef(null);

    // Track inspected words for Sweep
    const inspectedWordsRef = useRef(new Set());

    // Calibration banner state
    const [calibrationBanner, setCalibrationBanner] = useState(null);

    // --- Effects ---
    useEffect(() => {
        // Check URL params for cross-mode navigation
        const urlParams = new URLSearchParams(window.location.search);
        const urlSourceId = urlParams.get('source_id');

        if (urlSourceId) {
            // Direct article load from URL parameter
            console.log('Cross-mode navigation to:', urlSourceId);
            loadArticle(urlSourceId, selectedOptionIndex);
            // Clear URL params to avoid re-triggering on refresh
            window.history.replaceState({}, '', window.location.pathname);
        } else {
            fetchArticleList();
        }
        fetchCalibrationLevel();
    }, []);

    // Fetch user's calibration level and auto-select highlight option
    const fetchCalibrationLevel = async () => {
        try {
            const res = await fetch('/api/proficiency/calibration/level');
            if (res.ok) {
                const data = await res.json();
                if (data.level !== null && data.level !== undefined) {
                    const optionIndex = mapLevelToOptionIndex(data.level);
                    setSelectedOptionIndex(optionIndex);
                    setCalibrationBanner(
                        `Based on your calibration (Level ${data.level}), we suggest: ${HIGHLIGHT_OPTIONS[optionIndex].label}`
                    );
                }
            }
        } catch (e) {
            console.error('Failed to fetch calibration level:', e);
        }
    };

    // Re-fetch article if option changes
    useEffect(() => {
        if (selectedArticle && showHighlights) {
            loadArticle(selectedArticle.id, selectedOptionIndex);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOptionIndex]);

    // Fetch dictionary data when selectedWord changes
    useEffect(() => {
        if (!selectedWord) return;

        let cancelled = false;
        setIsInspecting(true);

        const fetchData = async () => {
            try {
                // 1. Log to inspect endpoint (fire-and-forget for source tracking)
                const logParams = new URLSearchParams({
                    word: selectedWord,
                    source_type: 'epub',
                    source_id: selectedArticle?.id || '',
                    context: currentContext
                });
                fetch(`/api/inspect?${logParams.toString()}`).catch(() => { });

                // 2. Fetch full dictionary data from LDOCE
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
    }, [selectedWord, selectedArticle?.id, currentContext]);

    // --- Actions ---
    const fetchArticleList = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/reading/epub/list');
            if (res.ok) {
                const data = await res.json();
                const articlesData = data.articles || [];

                // Fetch article status to get completion info
                if (data.filename && articlesData.length > 0) {
                    try {
                        const statusRes = await fetch(`/api/content/article-status?filename=${encodeURIComponent(data.filename)}`);
                        if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            // Merge status into articles
                            const statusMap = new Map(
                                statusData.articles?.map(a => [a.source_id, a]) || []
                            );
                            articlesData.forEach(article => {
                                const status = statusMap.get(article.source_id);
                                if (status) {
                                    article.status = status.status;
                                    article.study_progress = status.study_progress;
                                    article.reading_sessions = status.reading_sessions;
                                }
                            });
                        }
                    } catch (statusErr) {
                        console.warn('Could not fetch article status:', statusErr);
                    }
                }

                setArticles(articlesData);
            }
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const loadArticle = async (sourceId, optIndex = null) => {
        setIsLoading(true);
        try {
            const idx = optIndex !== null ? optIndex : selectedOptionIndex;
            const option = HIGHLIGHT_OPTIONS[idx];

            let url = `/api/reading/article?source_id=${encodeURIComponent(sourceId)}`;

            if (option) {
                url += `&book_code=${option.value}`;
                if (option.range) {
                    url += `&min_sequence=${option.range[0]}&max_sequence=${option.range[1]}`;
                }
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                // Vocabulary highlights (COCA, CET-4, etc.)
                data.highlightSet = new Set((data.highlights || []).map(w => w.toLowerCase()));
                // Study highlights (words looked up during Sentence Study) - shown in a different color
                data.studyHighlightSet = new Set((data.study_highlights || []).map(w => w.toLowerCase()));
                setSelectedArticle(data);
                setVisibleCount(BATCH_SIZE);

                // Start reading session tracking
                if (trackerRef.current) {
                    await trackerRef.current.end();
                }
                trackerRef.current = new ReadingTracker({
                    id: sourceId,
                    source_type: 'epub',
                    title: data.title,
                    sentences: data.sentences?.map(s => s.text || s) || []
                }, api);
                await trackerRef.current.start();
            }
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    const handleWordClick = useCallback((word, sentence) => {
        setSelectedWord(word);
        setInspectorData(null);
        setCurrentContext(sentence);
        inspectedWordsRef.current.add(word.toLowerCase());
    }, []);

    const handleMarkAsKnown = useCallback(async (word) => {
        // 1. Optimistic Update
        const lowerWord = word.toLowerCase();
        if (selectedArticle && selectedArticle.highlightSet) {
            selectedArticle.highlightSet.delete(lowerWord);
            // Force re-render of highlights by cloning (not deep cloning set, just reference ref or forceUpdate?)
            // Actually ReaderView usually re-renders if article prop changes. 
            // We might need to clone selectedArticle to trigger update.
            setSelectedArticle(prev => ({
                ...prev,
                highlightSet: new Set([...prev.highlightSet].filter(w => w !== lowerWord))
            }));
        }

        // 2. Close inspector
        setSelectedWord(null);

        // 3. API Call
        try {
            await api.put('/api/proficiency/word', { word: lowerWord, status: 'mastered' });
        } catch (e) {
            console.error("Failed to mark as known", e);
            // Revert? (Enhancement)
        }
    }, [selectedArticle]);

    const handleSweep = useCallback(async () => {
        if (!selectedArticle || !selectedArticle.highlightSet) return;

        const allHighlights = Array.from(selectedArticle.highlightSet);
        const inspected = Array.from(inspectedWordsRef.current);
        const sweptWords = allHighlights.filter(w => !inspectedWordsRef.current.has(w));

        if (sweptWords.length === 0) {
            alert("No words to sweep!");
            return;
        }

        if (!window.confirm(`Mark ${sweptWords.length} remaining highlighted words as Known?`)) {
            return;
        }

        // Optimistic clear
        setSelectedArticle(prev => ({
            ...prev,
            highlightSet: new Set()
        }));

        try {
            const res = await api.post('/api/proficiency/sweep', {
                swept_words: sweptWords,
                inspected_words: inspected
            });

            // Show recommendation if any
            if (res.recommendation) {
                const { bands } = res.recommendation;
                if (bands && bands.length > 0) {
                    // Determine range labels
                    const ranges = bands.map(b => `${b}-${b + 1000}`).join(", ");
                    if (window.confirm(`Expert Detected! You swept most words in the ${ranges} frequency bands. Mark ALL words in these bands as Mastered?`)) {
                        // TODO: Call API to master bands (Future Phase)
                        alert("Global mastery update coming in next phase!");
                    }
                }
            }
        } catch (e) {
            console.error("Sweep failed", e);
        }
    }, [selectedArticle]);

    const handleBackToLibrary = useCallback(async () => {
        if (trackerRef.current) {
            const result = await trackerRef.current.end();
            console.log('[ReadingMode] Session ended:', result);
            trackerRef.current = null;
        }
        setSelectedArticle(null);
        setSelectedWord(null);
    }, []);

    const playAudio = useCallback((text) => {
        if (!text) return;
        if (audioRef.current) {
            audioRef.current.pause();
        }
        const url = `/api/tts?text=${encodeURIComponent(text)}`;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(e => console.error(e));
    }, []);

    const handleImageClick = useCallback((src, alt, caption) => {
        setLightboxImage({ src, alt, caption });
    }, []);

    // --- Views ---
    if (!selectedArticle) {
        return (
            <ArticleListView
                articles={articles}
                isLoading={isLoading}
                onArticleClick={(sourceId) => loadArticle(sourceId, selectedOptionIndex)}
            />
        );
    }

    return (
        <>
            <ReaderView
                article={selectedArticle}
                visibleCount={visibleCount}
                setVisibleCount={setVisibleCount}
                selectedOptionIndex={selectedOptionIndex}
                setSelectedOptionIndex={setSelectedOptionIndex}
                showHighlights={showHighlights}
                setShowHighlights={setShowHighlights}
                selectedWord={selectedWord}
                onWordClick={handleWordClick}
                onBackToLibrary={handleBackToLibrary}
                onImageClick={handleImageClick}
                onSweep={handleSweep}
                trackerRef={trackerRef}
                calibrationBanner={calibrationBanner}
            />

            <WordInspector
                selectedWord={selectedWord}
                inspectorData={inspectorData}
                isInspecting={isInspecting}
                onClose={() => setSelectedWord(null)}
                onPlayAudio={playAudio}
                onMarkAsKnown={handleMarkAsKnown}
            />

            {lightboxImage && (
                <Lightbox
                    src={lightboxImage.src}
                    alt={lightboxImage.alt}
                    caption={lightboxImage.caption}
                    onClose={() => setLightboxImage(null)}
                />
            )}
        </>
    );
};

export default ReadingMode;
