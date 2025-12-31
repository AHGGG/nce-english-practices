import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReadingTracker from '../../utils/ReadingTracker';
import ArticleListView from './ArticleListView';
import ReaderView from './ReaderView';
import WordInspector from './WordInspector';
import Lightbox from './Lightbox';
import { HIGHLIGHT_OPTIONS, BATCH_SIZE } from './constants';

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

    // --- Effects ---
    useEffect(() => {
        fetchArticleList();
    }, []);

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
                setArticles(data.articles || []);
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
                data.highlightSet = new Set((data.highlights || []).map(w => w.toLowerCase()));
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
    }, []);

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
                trackerRef={trackerRef}
            />

            <WordInspector
                selectedWord={selectedWord}
                inspectorData={inspectorData}
                isInspecting={isInspecting}
                onClose={() => setSelectedWord(null)}
                onPlayAudio={playAudio}
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
