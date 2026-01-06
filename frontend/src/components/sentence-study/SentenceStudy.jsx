/**
 * SentenceStudy - Adaptive Sentence Learning Mode (ASL)
 * 
 * Refactored: Orchestrates view components and manages shared state.
 * Views are in ./views/, API calls in ./api.js, constants in ./constants.js
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Local imports
import sentenceStudyApi from './api';
import { VIEW_STATES, DIFFICULTY_CHOICES, extractSentencesFromBlocks } from './constants';
import { HIGHLIGHT_OPTIONS, mapLevelToOptionIndex } from '../reading/constants';
import WordInspector from '../reading/WordInspector';

// View components
import {
    BookShelfView,
    ArticleListView,
    OverviewView,
    StudyingView,
    CompletedView
} from './views';

const SentenceStudy = () => {
    const navigate = useNavigate();

    // View state
    const [view, setView] = useState(VIEW_STATES.BOOK_SHELF);
    const [books, setBooks] = useState([]);
    const [selectedBook, setSelectedBook] = useState(null);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Article & sentence state
    const [currentArticle, setCurrentArticle] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState({ studied_count: 0, clear_count: 0, unclear_count: 0 });

    // Interaction state
    const [wordClicks, setWordClicks] = useState([]);
    const [phraseClicks, setPhraseClicks] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [showDiagnose, setShowDiagnose] = useState(false);
    const [simplifiedText, setSimplifiedText] = useState(null);
    const [simplifyingType, setSimplifyingType] = useState(null);
    const [simplifyStage, setSimplifyStage] = useState(1);
    const [isSimplifying, setIsSimplifying] = useState(false);

    // Overview state
    const [overview, setOverview] = useState(null);
    const [loadingOverview, setLoadingOverview] = useState(false);
    const [overviewStreamContent, setOverviewStreamContent] = useState('');

    // Study highlights state (for COMPLETED view)
    const [studyHighlights, setStudyHighlights] = useState({ word_clicks: [], phrase_clicks: [] });

    // Dictionary state
    const [selectedWord, setSelectedWord] = useState(null);
    const [isPhrase, setIsPhrase] = useState(false);
    const [inspectorData, setInspectorData] = useState(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [currentSentenceContext, setCurrentSentenceContext] = useState('');

    // Collocations
    const [collocations, setCollocations] = useState([]);
    const [isLoadingCollocations, setIsLoadingCollocations] = useState(false);

    // Streaming explanation
    const [contextExplanation, setContextExplanation] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);
    const [explainStyle, setExplainStyle] = useState('default');

    // Refs
    const audioRef = useRef(null);
    const sentenceContainerRef = useRef(null);
    const explainRequestIdRef = useRef(0);

    // Highlight settings
    const [highlightOptionIndex, setHighlightOptionIndex] = useState(0);

    // Compute flat sentence list from blocks
    const flatSentences = useMemo(() => {
        if (!currentArticle?.blocks?.length) return [];
        return extractSentencesFromBlocks(currentArticle.blocks);
    }, [currentArticle]);

    // === Book Selection ===
    const selectBook = async (book) => {
        setLoading(true);
        setSelectedBook(book);
        try {
            const data = await sentenceStudyApi.getArticles(book.filename);
            const filtered = (data.articles || []).filter(a => a.sentence_count > 0);
            setArticles(filtered);
            setView(VIEW_STATES.ARTICLE_LIST);
        } catch (e) {
            console.error('Failed to load articles for book:', e);
        } finally {
            setLoading(false);
        }
    };

    // === Initial Load ===
    useEffect(() => {
        const load = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const urlSourceId = urlParams.get('source_id');
                const urlSentence = urlParams.get('sentence');

                const [booksData, calibrationData, lastSession] = await Promise.all([
                    sentenceStudyApi.getBooks(),
                    sentenceStudyApi.getCalibration(),
                    sentenceStudyApi.getLastSession()
                ]);

                setBooks(booksData.books || []);

                if (calibrationData?.level !== undefined) {
                    setHighlightOptionIndex(mapLevelToOptionIndex(calibrationData.level));
                }

                // URL parameter navigation
                if (urlSourceId && urlSourceId.startsWith('epub:')) {
                    const parts = urlSourceId.split(':');
                    if (parts.length >= 3) {
                        const filename = parts[1];
                        const book = (booksData.books || []).find(b => b.filename === filename);
                        setSelectedBook(book || { filename, title: filename });

                        const articlesData = await sentenceStudyApi.getArticles(filename);
                        setArticles((articlesData.articles || []).filter(a => a.sentence_count > 0));

                        await startStudying(urlSourceId);

                        if (urlSentence) {
                            const sentenceIdx = parseInt(urlSentence, 10);
                            if (!isNaN(sentenceIdx)) setCurrentIndex(sentenceIdx);
                        }

                        window.history.replaceState({}, '', window.location.pathname);
                        return;
                    }
                }

                // Restore last session
                if (lastSession?.source_id?.startsWith('epub:')) {
                    const parts = lastSession.source_id.split(':');
                    if (parts.length >= 3) {
                        const filename = parts[1];
                        const book = (booksData.books || []).find(b => b.filename === filename);
                        setSelectedBook(book || { filename, title: filename });

                        const articlesData = await sentenceStudyApi.getArticles(filename);
                        const filtered = (articlesData.articles || []).filter(a => a.sentence_count > 0);
                        setArticles(filtered);

                        if (filtered.find(a => a.source_id === lastSession.source_id)) {
                            await startStudying(lastSession.source_id);
                        } else {
                            setView(VIEW_STATES.ARTICLE_LIST);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to load initial data:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // === Dictionary Effect ===
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
                const data = await sentenceStudyApi.getDictionary(selectedWord);
                if (!cancelled && data) setInspectorData(data);
            } catch (e) {
                console.error('Dictionary fetch error:', e);
            } finally {
                if (!cancelled) setIsInspecting(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [selectedWord]);

    // === Stream Explanation Effect ===
    useEffect(() => {
        if (!selectedWord || !currentSentenceContext) return;

        const currentRequestId = ++explainRequestIdRef.current;
        setIsExplaining(true);
        setContextExplanation('');

        const prevSentence = currentIndex > 0 ? flatSentences[currentIndex - 1]?.text : null;
        const nextSentence = currentIndex < flatSentences.length - 1 ? flatSentences[currentIndex + 1]?.text : null;

        const streamExplanation = async () => {
            try {
                const res = await sentenceStudyApi.streamExplainWord({
                    text: selectedWord,
                    sentence: currentSentenceContext,
                    prev_sentence: prevSentence,
                    next_sentence: nextSentence,
                    style: explainStyle
                });

                if (explainRequestIdRef.current !== currentRequestId) return;
                if (!res.ok) throw new Error('Failed to fetch');

                const reader = res.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (explainRequestIdRef.current !== currentRequestId) {
                        reader.cancel();
                        return;
                    }
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    for (const line of chunk.split('\n')) {
                        if (explainRequestIdRef.current !== currentRequestId) return;
                        if (line.startsWith('data: ')) {
                            const text = line.slice(6);
                            if (text === '[DONE]' || text.startsWith('[ERROR]')) break;
                            setContextExplanation(prev => prev + text);
                        }
                    }
                }
            } catch (e) {
                console.error('Stream error:', e);
            } finally {
                if (explainRequestIdRef.current === currentRequestId) {
                    setIsExplaining(false);
                }
            }
        };

        streamExplanation();
    }, [selectedWord, currentSentenceContext, currentIndex, explainStyle, flatSentences]);

    // === Collocations Effect ===
    useEffect(() => {
        const currentSentenceText = flatSentences[currentIndex]?.text;
        if (!currentSentenceText || view !== VIEW_STATES.STUDYING) {
            setCollocations([]);
            return;
        }

        let cancelled = false;
        setCollocations([]);
        setIsLoadingCollocations(true);

        const fetchCollocations = async () => {
            try {
                const data = await sentenceStudyApi.detectCollocations(currentSentenceText);
                if (!cancelled) setCollocations(data.collocations || []);
            } catch (e) {
                console.error('Failed to detect collocations:', e);
                if (!cancelled) setCollocations([]);
            } finally {
                if (!cancelled) setIsLoadingCollocations(false);
            }
        };

        fetchCollocations();

        // Prefetch upcoming
        const upcoming = flatSentences.slice(currentIndex + 1, currentIndex + 4).map(s => s?.text).filter(Boolean);
        if (upcoming.length > 0) sentenceStudyApi.prefetchCollocations(upcoming);

        return () => { cancelled = true; };
    }, [currentIndex, view, flatSentences]);

    // === Handlers ===
    const playAudio = useCallback((text) => {
        if (!text) return;
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(`/api/tts?text=${encodeURIComponent(text)}`);
        audioRef.current = audio;
        audio.play().catch(console.error);
    }, []);

    const handleCloseInspector = useCallback(() => {
        setSelectedWord(null);
        setInspectorData(null);
        setContextExplanation('');
    }, []);

    const startStudying = useCallback(async (sourceId) => {
        setLoading(true);
        setLoadingOverview(true);
        try {
            const [article, progressData] = await Promise.all([
                sentenceStudyApi.getArticle(sourceId, highlightOptionIndex),
                sentenceStudyApi.getProgress(sourceId)
            ]);

            setCurrentArticle(article);
            setProgress(progressData);
            setWordClicks([]);
            setShowDiagnose(false);
            setSimplifiedText(null);
            setOverviewStreamContent('');
            setOverview(null);

            const totalSentences = article.sentence_count || article.sentences?.length || 0;
            if (progressData.current_index >= totalSentences && totalSentences > 0) {
                const highlights = await sentenceStudyApi.getStudyHighlights(sourceId, totalSentences);
                setStudyHighlights(highlights);
                setCurrentIndex(0);
                setView(VIEW_STATES.COMPLETED);
                return;
            }

            setCurrentIndex(progressData.current_index || 0);
            setView(VIEW_STATES.OVERVIEW);

            // Stream overview
            const res = await sentenceStudyApi.getOverview(
                article.title,
                article.full_text,
                totalSentences
            );

            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('text/event-stream')) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    for (const line of decoder.decode(value, { stream: true }).split('\n')) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.type === 'chunk') setOverviewStreamContent(prev => prev + data.content);
                                else if (data.type === 'done') setOverview(data.overview);
                            } catch (e) { /* ignore */ }
                        }
                    }
                }
            } else {
                setOverview(await res.json());
            }
        } catch (e) {
            console.error('Failed to load article:', e);
        } finally {
            setLoading(false);
            setLoadingOverview(false);
        }
    }, [highlightOptionIndex]);

    const startSentenceStudy = useCallback(() => {
        setStartTime(Date.now());
        setView(VIEW_STATES.STUDYING);
    }, []);

    const handleWordClick = useCallback((word, sentence) => {
        if (!word) return;
        const cleanWord = word.toLowerCase().trim();
        if (cleanWord.length < 2) return;

        const hasMultipleWords = cleanWord.includes(' ');

        if (hasMultipleWords) {
            if (!phraseClicks.includes(cleanWord)) setPhraseClicks(prev => [...prev, cleanWord]);
        } else {
            if (!wordClicks.includes(cleanWord)) setWordClicks(prev => [...prev, cleanWord]);
        }

        setIsPhrase(hasMultipleWords);
        setInspectorData(null);
        setCurrentSentenceContext(sentence || '');
        setContextExplanation('');
        setExplainStyle('default');
        setSelectedWord(cleanWord);
    }, [wordClicks, phraseClicks]);

    const handleClear = useCallback(async () => {
        const dwellTime = Date.now() - startTime;
        const currentSentence = flatSentences[currentIndex];
        const wordCount = currentSentence?.text?.split(/\s+/).filter(w => w.length > 0).length || 0;

        await sentenceStudyApi.recordLearning({
            source_type: 'epub',
            source_id: currentArticle.id,
            sentence_index: currentIndex,
            sentence_text: currentSentence?.text,
            initial_response: 'clear',
            word_clicks: wordClicks,
            phrase_clicks: phraseClicks,
            dwell_time_ms: dwellTime,
            word_count: wordCount
        });

        advanceToNext('clear');
    }, [currentArticle, currentIndex, wordClicks, phraseClicks, startTime, flatSentences]);

    const handleUnclear = useCallback(() => setShowDiagnose(true), []);

    const handleDifficultyChoice = useCallback(async (choice, stage = 1) => {
        setIsSimplifying(true);
        setSimplifyingType(choice);
        setSimplifyStage(stage);
        setSimplifiedText('');

        const currentSentence = flatSentences[currentIndex]?.text || '';
        const prevSentence = currentIndex > 0 ? flatSentences[currentIndex - 1]?.text : null;
        const nextSentence = currentIndex < flatSentences.length - 1 ? flatSentences[currentIndex + 1]?.text : null;

        try {
            const res = await fetch('/api/sentence-study/simplify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sentence: currentSentence,
                    simplify_type: choice,
                    stage,
                    prev_sentence: prevSentence,
                    next_sentence: nextSentence
                })
            });

            if (!res.ok) throw new Error('Simplify request failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let streamedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                for (const line of decoder.decode(value, { stream: true }).split('\n')) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk') {
                                streamedText += data.content;
                                setSimplifiedText(streamedText);
                            } else if (data.type === 'done') {
                                setSimplifyStage(data.stage);
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
            }
        } catch (e) {
            console.error('Simplify failed:', e);
            setSimplifiedText('Failed to generate. Please try again.');
        } finally {
            setIsSimplifying(false);
        }
    }, [currentIndex, flatSentences]);

    const handleSimplifiedResponse = useCallback(async (gotIt) => {
        const dwellTime = Date.now() - startTime;
        const currentSentence = flatSentences[currentIndex];
        const wordCount = currentSentence?.text?.split(/\s+/).filter(w => w.length > 0).length || 0;

        await sentenceStudyApi.recordLearning({
            source_type: 'epub',
            source_id: currentArticle.id,
            sentence_index: currentIndex,
            sentence_text: currentSentence?.text,
            initial_response: 'unclear',
            unclear_choice: simplifyingType,
            simplified_response: gotIt ? 'got_it' : 'still_unclear',
            word_clicks: wordClicks,
            phrase_clicks: phraseClicks,
            dwell_time_ms: dwellTime,
            word_count: wordCount,
            max_simplify_stage: simplifyStage
        });

        if (gotIt) {
            advanceToNext('unclear');
        } else if (simplifyStage < 3) {
            setSimplifiedText(null);
            handleDifficultyChoice(simplifyingType, simplifyStage + 1);
        } else {
            advanceToNext('unclear');
        }
    }, [currentArticle, currentIndex, wordClicks, phraseClicks, startTime, simplifyingType, simplifyStage, handleDifficultyChoice, flatSentences]);

    const advanceToNext = useCallback(async (result) => {
        const updateProgress = (prev) => ({
            ...prev,
            studied_count: prev.studied_count + 1,
            current_index: prev.current_index + 1,
            clear_count: result === 'clear' ? (prev.clear_count || 0) + 1 : prev.clear_count,
            unclear_count: result === 'unclear' ? (prev.unclear_count || 0) + 1 : prev.unclear_count
        });

        if (currentIndex < flatSentences.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setWordClicks([]);
            setPhraseClicks([]);
            setStartTime(Date.now());
            setShowDiagnose(false);
            setSimplifiedText(null);
            setSimplifyingType(null);
            setSimplifyStage(1);
            setProgress(updateProgress);
        } else {
            // Use backend API values for accurate progress when completing article
            const highlights = await sentenceStudyApi.getStudyHighlights(currentArticle.id, flatSentences.length);
            setStudyHighlights(highlights);
            // Use API response values to ensure accuracy (fixes clear rate display issue)
            setProgress(prev => ({
                ...prev,
                studied_count: highlights.studied_count,
                clear_count: highlights.clear_count,
                current_index: highlights.studied_count  // All sentences completed
            }));
            setView(VIEW_STATES.COMPLETED);
        }
    }, [currentArticle, currentIndex, flatSentences]);

    const handleBack = useCallback(() => {
        if (view === VIEW_STATES.STUDYING || view === VIEW_STATES.OVERVIEW || view === VIEW_STATES.COMPLETED) {
            setView(VIEW_STATES.ARTICLE_LIST);
            setCurrentArticle(null);
            setCurrentIndex(0);
            setStudyHighlights({ word_clicks: [], phrase_clicks: [] });
        } else if (view === VIEW_STATES.ARTICLE_LIST) {
            setView(VIEW_STATES.BOOK_SHELF);
            setSelectedBook(null);
            setArticles([]);
        } else {
            navigate('/nav');
        }
    }, [view, navigate]);

    // === Render ===
    const renderView = () => {
        switch (view) {
            case VIEW_STATES.BOOK_SHELF:
                return (
                    <BookShelfView
                        books={books}
                        loading={loading}
                        onSelectBook={selectBook}
                    />
                );
            case VIEW_STATES.ARTICLE_LIST:
                return (
                    <ArticleListView
                        selectedBook={selectedBook}
                        articles={articles}
                        loading={loading}
                        onBack={handleBack}
                        onSelectArticle={startStudying}
                    />
                );
            case VIEW_STATES.OVERVIEW:
                return (
                    <OverviewView
                        article={currentArticle}
                        overview={overview}
                        overviewStreamContent={overviewStreamContent}
                        onBack={handleBack}
                        onStartStudying={startSentenceStudy}
                    />
                );
            case VIEW_STATES.COMPLETED:
                return (
                    <CompletedView
                        article={currentArticle}
                        sentences={currentArticle?.sentences || []}
                        studyHighlights={studyHighlights}
                        progress={progress}
                        onBack={handleBack}
                        onWordClick={handleWordClick}
                    />
                );
            case VIEW_STATES.STUDYING:
            default:
                return (
                    <StudyingView
                        currentSentence={flatSentences[currentIndex]}
                        currentIndex={currentIndex}
                        totalSentences={flatSentences.length}
                        highlightSet={currentArticle?.highlightSet}
                        collocations={collocations}
                        wordClicks={wordClicks}
                        showDiagnose={showDiagnose}
                        simplifiedText={simplifiedText}
                        simplifyStage={simplifyStage}
                        isSimplifying={isSimplifying}
                        sentenceContainerRef={sentenceContainerRef}
                        onBack={handleBack}
                        onWordClick={handleWordClick}
                        onClear={handleClear}
                        onUnclear={handleUnclear}
                        onDifficultyChoice={handleDifficultyChoice}
                        onSimplifiedResponse={handleSimplifiedResponse}
                    />
                );
        }
    };

    return (
        <>
            {renderView()}

            {/* Word Inspector Modal */}
            {selectedWord && (
                <WordInspector
                    selectedWord={selectedWord}
                    inspectorData={inspectorData}
                    isInspecting={isInspecting}
                    onClose={handleCloseInspector}
                    onPlayAudio={playAudio}
                    onMarkAsKnown={handleCloseInspector}
                    contextExplanation={contextExplanation}
                    isExplaining={isExplaining}
                    isPhrase={isPhrase}
                    onExplainStyle={setExplainStyle}
                    currentStyle={explainStyle}
                />
            )}
        </>
    );
};

export default SentenceStudy;
