// Force rebuild: 639029600000000000 - Progressive Explanations
/**
 * SentenceStudy - Adaptive Sentence Learning Mode (ASL)
 * 
 * A sentence-by-sentence learning mode that allows users to:
 * - Study articles one sentence at a time
 * - Mark sentences as Clear or Unclear
 * - Get simplified versions when stuck (vocabulary/grammar/both)
 * - Track progress and learning gaps
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, CheckCircle, HelpCircle, Loader2, BookOpen, Sparkles, GraduationCap } from 'lucide-react';
import MemoizedSentence from '../reading/MemoizedSentence';
import WordInspector from '../reading/WordInspector';
import { HIGHLIGHT_OPTIONS, mapLevelToOptionIndex } from '../reading/constants';

// API helpers
const api = {
    async getProgress(sourceId) {
        const res = await fetch(`/api/sentence-study/${encodeURIComponent(sourceId)}/progress`);
        return res.json();
    },
    async recordLearning(data) {
        const res = await fetch('/api/sentence-study/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async simplify(data) {
        const res = await fetch('/api/sentence-study/simplify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    async getArticles() {
        const res = await fetch('/api/reading/epub/list');
        return res.json();
    },
    async getArticle(sourceId, optionIndex) {
        const opt = HIGHLIGHT_OPTIONS[optionIndex] || HIGHLIGHT_OPTIONS[0];
        const params = new URLSearchParams({
            source_id: sourceId,
            book_code: opt.bookCode || '',
            min_sequence: opt.minSeq || 0,
            max_sequence: opt.maxSeq || 99999
        });
        const res = await fetch(`/api/reading/article?${params}`);
        return res.json();
    },
    async getCalibration() {
        const res = await fetch('/api/proficiency/calibration/level');
        if (!res.ok) return null;
        return res.json();
    },
    async getOverview(title, fullText, totalSentences) {
        const res = await fetch('/api/sentence-study/overview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, full_text: fullText, total_sentences: totalSentences })
        });
        return res.json();
    }
};

// View States
const VIEW_STATES = {
    ARTICLE_LIST: 'article_list',
    OVERVIEW: 'overview',  // New: show article overview before studying
    STUDYING: 'studying'
};

// Difficulty choice options
const DIFFICULTY_CHOICES = [
    { id: 'vocabulary', label: '📖 Vocabulary', desc: 'Hard words' },
    { id: 'grammar', label: '🔧 Grammar', desc: 'Sentence structure' },
    { id: 'both', label: '🤷 Both', desc: "I don't understand anything" }
];

const SentenceStudy = () => {
    // View state
    const [view, setView] = useState(VIEW_STATES.ARTICLE_LIST);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    // Article & sentence state
    const [currentArticle, setCurrentArticle] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState({ studied_count: 0, clear_count: 0, unclear_count: 0 });

    // Interaction state
    const [wordClicks, setWordClicks] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [showDiagnose, setShowDiagnose] = useState(false);
    const [simplifiedText, setSimplifiedText] = useState(null);
    const [simplifyingType, setSimplifyingType] = useState(null);
    const [isSimplifying, setIsSimplifying] = useState(false);

    // Overview state
    const [overview, setOverview] = useState(null);
    const [loadingOverview, setLoadingOverview] = useState(false);
    const [overviewStreamContent, setOverviewStreamContent] = useState(''); // For streaming display

    // Dictionary state (for word click popup)
    const [selectedWord, setSelectedWord] = useState(null);  // Can be word or phrase
    const [isPhrase, setIsPhrase] = useState(false);  // True when selection is a phrase
    const [inspectorData, setInspectorData] = useState(null);
    const [isInspecting, setIsInspecting] = useState(false);
    const [currentSentenceContext, setCurrentSentenceContext] = useState('');

    // Collocations detected in current sentence
    const [collocations, setCollocations] = useState([]);
    const [isLoadingCollocations, setIsLoadingCollocations] = useState(false);

    // Streaming context explanation
    const [contextExplanation, setContextExplanation] = useState('');
    const [isExplaining, setIsExplaining] = useState(false);
    const [explainStyle, setExplainStyle] = useState('default'); // default, simple, chinese_deep

    // Audio ref
    const audioRef = useRef(null);

    // Sentence container ref (for click handling)
    const sentenceContainerRef = useRef(null);

    // Highlight settings (reuse from Reading Mode)
    const [highlightOptionIndex, setHighlightOptionIndex] = useState(0);

    // Load articles on mount
    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getArticles();
                // Filter out articles with no sentences
                const filtered = (data.articles || []).filter(a => a.sentence_count > 0);
                setArticles(filtered);

                // Get calibration level
                const cal = await api.getCalibration();
                if (cal?.level !== undefined) {
                    setHighlightOptionIndex(mapLevelToOptionIndex(cal.level));
                }
            } catch (e) {
                console.error('Failed to load articles:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Fetch dictionary data when selectedWord changes (only for single words, not phrases)
    useEffect(() => {
        // Check for phrase directly here - more reliable than depending on isPhrase state
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
    }, [selectedWord]);  // Only depend on selectedWord - check phrase inline

    // Stream context explanation when selectedWord changes
    useEffect(() => {
        if (!selectedWord || !currentSentenceContext) return;

        let cancelled = false;
        setIsExplaining(true);
        setContextExplanation('');

        const sentences = currentArticle?.sentences || [];
        const prevSentence = currentIndex > 0 ? sentences[currentIndex - 1]?.text : null;
        const nextSentence = currentIndex < sentences.length - 1 ? sentences[currentIndex + 1]?.text : null;

        const streamExplanation = async () => {
            try {
                const res = await fetch('/api/sentence-study/explain-word', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: selectedWord,  // Use new 'text' field to support phrases
                        sentence: currentSentenceContext,
                        prev_sentence: prevSentence,
                        next_sentence: nextSentence,
                        style: explainStyle
                    })
                });

                if (!res.ok) throw new Error('Failed to fetch');

                const reader = res.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done || cancelled) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const text = line.slice(6);
                            if (text === '[DONE]') {
                                break;
                            } else if (text.startsWith('[ERROR]')) {
                                console.error('Stream error:', text);
                                break;
                            } else {
                                if (!cancelled) {
                                    setContextExplanation(prev => prev + text);
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('Stream error:', e);
            } finally {
                if (!cancelled) setIsExplaining(false);
            }
        };

        streamExplanation();
        return () => { cancelled = true; };
    }, [selectedWord, currentSentenceContext, currentArticle, currentIndex, explainStyle]);

    // Fetch collocations when sentence changes
    useEffect(() => {
        const sentences = currentArticle?.sentences || [];
        const currentSentenceText = sentences[currentIndex]?.text;

        if (!currentSentenceText || view !== VIEW_STATES.STUDYING) {
            setCollocations([]);
            return;
        }

        let cancelled = false;
        setIsLoadingCollocations(true);

        const fetchCollocations = async () => {
            try {
                const res = await fetch('/api/sentence-study/detect-collocations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sentence: currentSentenceText })
                });

                if (!cancelled && res.ok) {
                    const data = await res.json();
                    setCollocations(data.collocations || []);
                }
            } catch (e) {
                console.error('Failed to detect collocations:', e);
                if (!cancelled) setCollocations([]);
            } finally {
                if (!cancelled) setIsLoadingCollocations(false);
            }
        };

        fetchCollocations();
        return () => { cancelled = true; };
    }, [currentArticle, currentIndex, view]);

    // Play audio
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

    // Close inspector
    const handleCloseInspector = useCallback(() => {
        setSelectedWord(null);
        setInspectorData(null);
        setContextExplanation('');
    }, []);

    // Load article for studying
    const startStudying = useCallback(async (sourceId) => {
        setLoading(true);
        setLoadingOverview(true);
        try {
            const [article, progressData] = await Promise.all([
                api.getArticle(sourceId, highlightOptionIndex),
                api.getProgress(sourceId)
            ]);

            setCurrentArticle(article);
            setCurrentIndex(progressData.current_index || 0);
            setProgress(progressData);
            setWordClicks([]);
            setShowDiagnose(false);
            setSimplifiedText(null);
            setOverviewStreamContent('');
            setOverview(null);
            setView(VIEW_STATES.OVERVIEW);  // Show overview first

            // Fetch overview with streaming support
            const res = await fetch('/api/sentence-study/overview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: article.title,
                    full_text: article.full_text,
                    total_sentences: article.sentence_count || article.sentences?.length || 0
                })
            });

            const contentType = res.headers.get('content-type') || '';

            if (contentType.includes('text/event-stream')) {
                // Streaming response (first time, not cached)
                const reader = res.body.getReader();
                const decoder = new TextDecoder();

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
                                    setOverviewStreamContent(prev => prev + data.content);
                                } else if (data.type === 'done') {
                                    setOverview(data.overview);
                                } else if (data.type === 'error') {
                                    console.error('Overview error:', data.message);
                                }
                            } catch (e) {
                                // Ignore parse errors for partial chunks
                            }
                        }
                    }
                }
            } else {
                // JSON response (cached)
                const overviewData = await res.json();
                setOverview(overviewData);
            }
        } catch (e) {
            console.error('Failed to load article:', e);
        } finally {
            setLoading(false);
            setLoadingOverview(false);
        }
    }, [highlightOptionIndex]);

    // Start actual sentence study after overview
    const startSentenceStudy = useCallback(() => {
        setStartTime(Date.now());
        setView(VIEW_STATES.STUDYING);
    }, []);

    // Handle word click (track for gap analysis + show dictionary + stream explanation)
    const handleWordClick = useCallback((word, sentence) => {
        if (!word) return;
        const cleanWord = word.toLowerCase().trim();
        if (cleanWord.length < 2) return;

        // Detect if it's a phrase (multiple words)
        const hasMultipleWords = cleanWord.includes(' ');

        // DEBUG: Log phrase detection
        console.log('[handleWordClick] word:', JSON.stringify(cleanWord), 'hasSpace:', hasMultipleWords, 'charCodes:', [...cleanWord].map(c => c.charCodeAt(0)));

        // Track for gap analysis (only single words)
        if (!hasMultipleWords && !wordClicks.includes(cleanWord)) {
            setWordClicks(prev => [...prev, cleanWord]);
        }

        // IMPORTANT: Set isPhrase BEFORE selectedWord to ensure useEffect sees correct state
        // This prevents race condition where dictionary fetch triggers before isPhrase updates
        setIsPhrase(hasMultipleWords);
        setInspectorData(null);
        setCurrentSentenceContext(sentence || '');
        setContextExplanation('');
        setExplainStyle('default'); // Reset style for new word

        // Set selectedWord last to trigger the effects with correct isPhrase value
        setSelectedWord(cleanWord);
    }, [wordClicks]);

    // Handle Clear button
    const handleClear = useCallback(async () => {
        const dwellTime = Date.now() - startTime;

        await api.recordLearning({
            source_type: 'epub',
            source_id: currentArticle.id,
            sentence_index: currentIndex,
            initial_response: 'clear',
            word_clicks: wordClicks,
            dwell_time_ms: dwellTime
        });

        // Move to next sentence
        advanceToNext();
    }, [currentArticle, currentIndex, wordClicks, startTime]);

    // Handle Unclear button
    const handleUnclear = useCallback(() => {
        setShowDiagnose(true);
    }, []);

    // Handle difficulty choice selection
    const handleDifficultyChoice = useCallback(async (choice) => {
        setIsSimplifying(true);
        setSimplifyingType(choice);

        const sentences = currentArticle.sentences || [];
        const currentSentence = sentences[currentIndex]?.text || '';
        const prevSentence = currentIndex > 0 ? sentences[currentIndex - 1]?.text : null;
        const nextSentence = currentIndex < sentences.length - 1 ? sentences[currentIndex + 1]?.text : null;

        try {
            const result = await api.simplify({
                sentence: currentSentence,
                simplify_type: choice,
                prev_sentence: prevSentence,
                next_sentence: nextSentence
            });
            setSimplifiedText(result.simplified);
        } catch (e) {
            console.error('Simplify failed:', e);
            setSimplifiedText('Failed to generate simplified version. Please try again.');
        } finally {
            setIsSimplifying(false);
        }
    }, [currentArticle, currentIndex]);

    // Handle simplified response
    const handleSimplifiedResponse = useCallback(async (gotIt) => {
        const dwellTime = Date.now() - startTime;

        await api.recordLearning({
            source_type: 'epub',
            source_id: currentArticle.id,
            sentence_index: currentIndex,
            initial_response: 'unclear',
            unclear_choice: simplifyingType,
            simplified_response: gotIt ? 'got_it' : 'still_unclear',
            word_clicks: wordClicks,
            dwell_time_ms: dwellTime
        });

        if (gotIt) {
            advanceToNext();
        } else {
            // If still unclear and chose vocab/grammar, try the other one
            if (simplifyingType === 'vocabulary') {
                setSimplifiedText(null);
                handleDifficultyChoice('grammar');
            } else if (simplifyingType === 'grammar') {
                setSimplifiedText(null);
                handleDifficultyChoice('vocabulary');
            } else {
                // Both was chosen and still unclear - just advance
                advanceToNext();
            }
        }
    }, [currentArticle, currentIndex, wordClicks, startTime, simplifyingType, handleDifficultyChoice]);

    // Advance to next sentence
    const advanceToNext = useCallback(() => {
        const sentences = currentArticle?.sentences || [];
        if (currentIndex < sentences.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setWordClicks([]);
            setStartTime(Date.now());
            setShowDiagnose(false);
            setSimplifiedText(null);
            setSimplifyingType(null);
            setProgress(prev => ({
                ...prev,
                studied_count: prev.studied_count + 1,
                current_index: prev.current_index + 1
            }));
        } else {
            // Finished article!
            setView(VIEW_STATES.ARTICLE_LIST);
        }
    }, [currentArticle, currentIndex]);

    // Back to library
    const handleBack = useCallback(() => {
        setView(VIEW_STATES.ARTICLE_LIST);
        setCurrentArticle(null);
        setCurrentIndex(0);
    }, []);

    // Render article list
    const renderArticleList = () => (
        <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono">
            <header className="h-14 border-b border-[#333] flex items-center px-4 md:px-8 bg-[#0A0A0A]">
                <GraduationCap className="w-5 h-5 text-[#00FF94] mr-3" />
                <h1 className="text-sm font-bold uppercase tracking-wider">Sentence Study</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                    <p className="text-[#888] text-sm mb-6">
                        Study articles sentence by sentence. Mark each as Clear or Unclear to build your learning profile.
                    </p>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-[#00FF94]" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {articles.map((article, i) => (
                                <button
                                    key={i}
                                    onClick={() => startStudying(article.source_id)}
                                    className="w-full text-left p-4 border border-[#333] bg-[#0A0A0A] hover:border-[#00FF94] hover:bg-[#00FF94]/5 transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-serif text-lg text-white truncate group-hover:text-[#00FF94]">
                                                {article.title}
                                            </h3>
                                            <p className="text-xs text-[#666] mt-1">
                                                {article.sentence_count} sentences
                                            </p>
                                        </div>
                                        <BookOpen className="w-4 h-4 text-[#666] group-hover:text-[#00FF94] ml-3 shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );

    // Render studying view
    const renderStudying = () => {
        const sentences = currentArticle?.sentences || [];
        const currentSentence = sentences[currentIndex];
        const totalSentences = sentences.length;
        const progressPercent = totalSentences > 0 ? ((currentIndex) / totalSentences) * 100 : 0;

        return (
            <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono">
                {/* Header */}
                <header className="h-14 border-b border-[#333] flex items-center justify-between px-4 md:px-8 bg-[#0A0A0A]">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-[#888] hover:text-[#00FF94] transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Exit</span>
                    </button>

                    <div className="text-xs text-[#666]">
                        {currentIndex + 1} / {totalSentences}
                    </div>
                </header>

                {/* Progress Bar */}
                <div className="h-1 bg-[#1A1A1A]">
                    <div
                        className="h-full bg-[#00FF94] transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Main Content */}
                <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-2xl w-full">
                        {/* Current Sentence */}
                        <div
                            ref={sentenceContainerRef}
                            className="font-serif text-xl md:text-2xl leading-relaxed text-center mb-8 p-6 border border-[#333] bg-[#0A0A0A] select-text"
                            onClick={(e) => {
                                const word = e.target.dataset?.word;
                                if (word) handleWordClick(word.toLowerCase(), currentSentence?.text || '');
                            }}
                        >
                            {currentSentence ? (
                                <MemoizedSentence
                                    text={currentSentence.text}
                                    highlightSet={currentArticle.highlightSet}
                                    showHighlights={true}
                                    collocations={collocations}
                                />
                            ) : (
                                <span className="text-[#666]">No sentence available</span>
                            )}
                        </div>

                        {/* Word clicks indicator */}
                        {wordClicks.length > 0 && (
                            <div className="text-center text-xs text-[#666] mb-4">
                                Looked up: {wordClicks.join(', ')}
                            </div>
                        )}

                        {/* Diagnose Mode */}
                        {showDiagnose && !simplifiedText && !isSimplifying && (
                            <div className="mb-8 p-4 border border-[#444] bg-[#0A0A0A]">
                                <p className="text-center text-sm text-[#888] mb-4">
                                    What's making this tricky?
                                </p>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {DIFFICULTY_CHOICES.map(choice => (
                                        <button
                                            key={choice.id}
                                            onClick={() => handleDifficultyChoice(choice.id)}
                                            className="px-4 py-3 border border-[#333] hover:border-[#00FF94] hover:bg-[#00FF94]/10 transition-all text-center"
                                        >
                                            <div className="text-lg">{choice.label}</div>
                                            <div className="text-xs text-[#666]">{choice.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Loading simplified version */}
                        {isSimplifying && (
                            <div className="mb-8 p-6 border border-[#00FF94]/30 bg-[#00FF94]/5 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-[#00FF94] mx-auto mb-2" />
                                <p className="text-sm text-[#888]">Generating simplified version...</p>
                            </div>
                        )}

                        {/* Simplified version */}
                        {simplifiedText && (
                            <div className="mb-8 p-6 border border-[#00FF94]/30 bg-[#00FF94]/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4 text-[#00FF94]" />
                                    <span className="text-xs text-[#00FF94] uppercase tracking-wider">
                                        {simplifyingType === 'vocabulary' ? 'Simpler Words' :
                                            simplifyingType === 'grammar' ? 'Simpler Structure' :
                                                'Simplified'}
                                    </span>
                                </div>
                                <p className="font-serif text-lg leading-relaxed text-[#CCC]">
                                    {simplifiedText}
                                </p>

                                {/* Response buttons */}
                                <div className="flex justify-center gap-4 mt-6">
                                    <button
                                        onClick={() => handleSimplifiedResponse(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-[#00FF94] text-black font-bold uppercase text-sm hover:bg-[#00CC77] transition-colors"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Got it!
                                    </button>
                                    <button
                                        onClick={() => handleSimplifiedResponse(false)}
                                        className="flex items-center gap-2 px-6 py-3 border border-[#666] text-[#888] hover:text-white hover:border-white transition-colors"
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                        Still Unclear
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Main action buttons (when not in diagnose mode) */}
                        {!showDiagnose && (
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-2 px-8 py-4 bg-[#00FF94] text-black font-bold uppercase text-sm hover:bg-[#00CC77] transition-colors"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Clear
                                </button>
                                <button
                                    onClick={handleUnclear}
                                    className="flex items-center gap-2 px-8 py-4 border border-[#666] text-[#888] hover:text-white hover:border-white transition-colors"
                                >
                                    <HelpCircle className="w-5 h-5" />
                                    Unclear
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    };

    // Render overview (context before studying)
    const renderOverview = () => (
        <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono">
            {/* Header */}
            <header className="h-14 border-b border-[#333] flex items-center justify-between px-4 md:px-8 bg-[#0A0A0A]">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-[#888] hover:text-[#00FF94] transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                </button>
                <div className="text-xs text-[#666]">
                    {currentArticle?.sentence_count || currentArticle?.sentences?.length || 0} sentences
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl w-full mx-auto">
                    {/* Article Title */}
                    <h1 className="font-serif text-2xl md:text-3xl text-white text-center mb-8">
                        {currentArticle?.title}
                    </h1>

                    {!overview ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[#00FF94] mb-4" />
                            <p className="text-[#888] text-sm">
                                {overviewStreamContent ? 'Generating Overview...' : 'Analyzing article...'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* English Summary */}
                            <div className="p-6 border border-[#333] bg-[#0A0A0A]">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className="w-4 h-4 text-[#00FF94]" />
                                    <span className="text-xs text-[#00FF94] uppercase tracking-wider">Overview</span>
                                </div>
                                <p className="font-serif text-lg leading-relaxed text-[#CCC]">
                                    {overview.summary_en}
                                </p>
                            </div>

                            {/* Chinese Translation */}
                            <div className="p-6 border border-[#444] bg-[#0A0A0A]/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs text-[#888] uppercase tracking-wider">中文概要</span>
                                </div>
                                <p className="text-base leading-relaxed text-[#AAA]">
                                    {overview.summary_zh}
                                </p>
                            </div>

                            {/* Key Topics */}
                            {overview.key_topics?.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {overview.key_topics.map((topic, i) => (
                                        <span key={i} className="px-3 py-1 text-xs bg-[#1A1A1A] border border-[#333] text-[#888]">
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Difficulty Hint */}
                            {overview.difficulty_hint && (
                                <p className="text-center text-xs text-[#666]">
                                    💡 {overview.difficulty_hint}
                                </p>
                            )}

                            {/* Start Button */}
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={startSentenceStudy}
                                    className="flex items-center gap-3 px-10 py-4 bg-[#00FF94] text-black font-bold uppercase text-sm hover:bg-[#00CC77] transition-colors"
                                >
                                    <GraduationCap className="w-5 h-5" />
                                    Start Studying
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );

    // Main render
    const content = view === VIEW_STATES.ARTICLE_LIST
        ? renderArticleList()
        : view === VIEW_STATES.OVERVIEW
            ? renderOverview()
            : renderStudying();

    return (
        <>
            {content}

            {/* Word Inspector - shows dictionary + streaming context explanation */}
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
