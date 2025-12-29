import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { BookOpen, ChevronLeft, Volume2, Eye, Loader2, X, Zap, Bookmark, Highlighter } from 'lucide-react';
import { Button, Card, Select, Tag } from '../components/ui';
import DictionaryResults from '../components/aui/DictionaryResults';

// --- Constants (hoisted outside component to prevent re-creation) ---
const BATCH_SIZE = 20;
const HIGHLIGHT_OPTIONS = [
    { label: 'COCA Top 5000', value: 'coca20000', range: [1, 5000] },
    { label: 'COCA 5k-10k', value: 'coca20000', range: [5001, 10000] },
    { label: 'COCA 10k-15k', value: 'coca20000', range: [10001, 15000] },
    { label: 'COCA 15k-20k', value: 'coca20000', range: [15001, 20000] },
    { label: 'CET-4', value: 'cet4' },
    { label: 'CET-6', value: 'cet6' },
    { label: 'QA Vocab', value: 'qa_vocab' }
];

/**
 * Memoized Sentence Component - CRITICAL for performance
 * Only re-renders when text/highlights change, NOT when selectedWord changes.
 * This prevents expensive re-renders of all sentences on each word click.
 */
const MemoizedSentence = memo(function MemoizedSentence({ text, highlightSet, showHighlights }) {
    if (!text) return null;

    // Split by spaces but keep delimiters to preserve spacing
    const tokens = text.split(/(\s+|[.,!?;:"'()])/);

    return (
        <p className="mb-6">
            {tokens.map((token, i) => {
                const clean = token.replace(/[^a-zA-Z'-]/g, '').toLowerCase();
                const isWord = /^[a-zA-Z'-]+$/.test(clean);

                if (!isWord) return <span key={i}>{token}</span>;

                // Highlight based on vocabulary list
                const isHighlighted = showHighlights && highlightSet?.has(clean);

                // Use data-word for CSS-based selection highlighting (no React re-render)
                return (
                    <span
                        key={i}
                        data-word={clean}
                        data-sentence={text}
                        className={`reading-word cursor-pointer rounded-sm px-0.5 ${isHighlighted
                            ? 'text-neon-cyan border-b-2 border-neon-cyan/50'
                            : 'hover:text-neon-cyan hover:bg-bg-elevated'
                            }`}
                    >
                        {token}
                    </span>
                );
            })}
        </p>
    );
});

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

    // Progressive loading
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const sentinelRef = useRef(null);
    const mainRef = useRef(null);

    // Audio
    const audioRef = useRef(null);

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

            // Add highlight params
            if (option) {
                url += `&book_code=${option.value}`;
                if (option.range) {
                    url += `&min_sequence=${option.range[0]}&max_sequence=${option.range[1]}`;
                }
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                // Ensure highlights is a Set for O(1) lookup
                data.highlightSet = new Set((data.highlights || []).map(w => w.toLowerCase()));
                setSelectedArticle(data);
                // Reset visible count for new article
                setVisibleCount(BATCH_SIZE);
            }
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    };

    // Progressive loading: Intersection Observer to load more sentences
    useEffect(() => {
        if (!selectedArticle?.sentences) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleCount(prev =>
                        Math.min(prev + BATCH_SIZE, selectedArticle.sentences.length)
                    );
                }
            },
            { rootMargin: '200px' } // Load 200px before reaching sentinel
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [selectedArticle?.sentences?.length, BATCH_SIZE]);

    // Event delegation: handle clicks on article container
    const handleArticleClick = useCallback((e) => {
        const target = e.target;
        const word = target.dataset?.word;
        const sentence = target.dataset?.sentence;

        if (!word) return;

        const cleanWord = word.toLowerCase();
        if (cleanWord.length < 2) return;

        setSelectedWord(cleanWord);
        setInspectorData(null);
        setCurrentContext(sentence || '');
    }, []);

    // State for context sentence
    const [currentContext, setCurrentContext] = useState('');

    // Fetch dictionary data when selectedWord changes (non-blocking)
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

    const playAudio = (text) => {
        if (!text) return;
        if (audioRef.current) {
            audioRef.current.pause();
        }
        // Use TTS API
        const url = `/api/tts?text=${encodeURIComponent(text)}`;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.play().catch(e => console.error(e));
    };

    // --- Rendering ---
    // NOTE: renderText logic has been moved to MemoizedSentence component
    // This prevents re-renders of all sentences when selectedWord changes

    // --- Views ---

    // 1. Article List View
    if (!selectedArticle) {
        return (
            <div className="h-screen flex flex-col bg-bg text-ink font-sans selection:bg-neon-cyan/30">
                <header className="h-16 border-b border-ink-faint flex items-center justify-between px-6 bg-bg/95 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neon-cyan/10 flex items-center justify-center text-neon-cyan border border-neon-cyan/20">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <h1 className="font-serif text-xl font-bold tracking-tight text-ink">Library</h1>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    {isLoading && articles.length === 0 ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ink-muted" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
                            {articles.map((article, idx) => (
                                <button
                                    key={article.source_id}
                                    onClick={() => loadArticle(article.source_id, selectedOptionIndex)}
                                    className="group flex flex-col items-start text-left p-6 bg-bg-paper border border-ink-faint hover:border-neon-cyan hover:shadow-hard transition-all duration-200"
                                >
                                    <div className="flex items-center gap-2 mb-4 w-full">
                                        <Tag variant="outline" color="gray">CHAPTER {idx + 1}</Tag>
                                        <div className="h-px bg-ink-faint flex-1 group-hover:bg-ink-muted transition-colors"></div>
                                    </div>
                                    <h3 className="font-serif text-xl font-bold text-ink group-hover:text-neon-cyan transition-colors mb-3 line-clamp-2 leading-snug">
                                        {article.title}
                                    </h3>
                                    <p className="text-sm text-ink-muted line-clamp-3 leading-relaxed font-mono">
                                        {article.preview}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    // 2. Reading View
    return (
        <div className="h-screen flex flex-col bg-bg text-ink font-sans selection:bg-neon-cyan/30">
            {/* Toolbar */}
            <header className="h-14 border-b border-ink-faint flex items-center justify-between px-4 bg-bg-paper/95 backdrop-blur shrink-0 z-20">
                <Button
                    onClick={() => { setSelectedArticle(null); setSelectedWord(null); }}
                    variant="ghost"
                    size="sm"
                    icon={ChevronLeft}
                >
                    LIBRARY
                </Button>

                {/* Highlight Controls */}
                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <select
                            value={selectedOptionIndex}
                            onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
                            className="bg-bg-elevated border border-ink-faint text-ink text-xs font-mono font-bold uppercase py-1.5 pl-3 pr-8 focus:outline-none focus:border-neon-green appearance-none cursor-pointer transition-colors hover:border-ink-muted"
                        >
                            {HIGHLIGHT_OPTIONS.map((opt, i) => (
                                <option key={i} value={i}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-ink-muted group-hover:text-neon-green">
                            <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
                        </div>
                    </div>

                    <button
                        onClick={() => setShowHighlights(!showHighlights)}
                        className={`p-1.5 border transition-all duration-200 ${showHighlights
                            ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                            : 'border-ink-faint text-ink-muted hover:text-ink hover:border-ink'}`}
                        title="Toggle Highlights"
                    >
                        <Zap className="w-4 h-4 fill-current" />
                    </button>
                </div>

                <div className="w-20"></div> {/* Spacer */}
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Article Text */}
                <main ref={mainRef} className="flex-1 overflow-y-auto px-4 md:px-0 py-8 scroll-smooth">
                    <article className="max-w-2xl mx-auto pb-32">
                        <header className="mb-10 text-center px-4">
                            <h1 className="font-serif text-3xl md:text-4xl text-ink mb-4 leading-tight">
                                {selectedArticle.title}
                            </h1>
                            <div className="flex items-center justify-center gap-4 text-xs text-ink-muted font-mono">
                                <span>{selectedArticle.sentence_count} Sentences</span>
                                <span>•</span>
                                <span>{selectedArticle.metadata?.filename?.split('.').slice(0, 2).join(' ')}</span>
                            </div>
                        </header>


                        {/* Event delegation + CSS containment for performance */}
                        <div
                            className="prose prose-invert prose-lg max-w-none font-serif md:text-xl leading-loose text-ink px-4"
                            style={{ contain: 'content' }}
                            data-selected-word={selectedWord || ''}
                            onClick={handleArticleClick}
                        >
                            {/* Progressive loading: only render visibleCount sentences */}
                            {/* Using MemoizedSentence to prevent re-renders on selectedWord change */}
                            {selectedArticle.sentences?.slice(0, visibleCount).map((sentence, idx) => (
                                <MemoizedSentence
                                    key={idx}
                                    text={sentence.text}
                                    highlightSet={selectedArticle.highlightSet}
                                    showHighlights={showHighlights}
                                />
                            ))}

                            {/* Sentinel element for Intersection Observer */}
                            {visibleCount < (selectedArticle.sentences?.length || 0) && (
                                <div
                                    ref={sentinelRef}
                                    className="flex justify-center py-4 text-ink-muted"
                                >
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="ml-2 text-xs">Loading more...</span>
                                </div>
                            )}
                        </div>
                    </article>
                </main>

                {/* Inspector Panel (Floating Card on Desktop, Bottom Sheet on Mobile) */}
                {
                    selectedWord && (
                        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-end md:justify-center md:items-end md:pr-8 md:pb-0">
                            {/* Backdrop for mobile only */}
                            <div className="absolute inset-0 bg-black/50 md:hidden pointer-events-auto" onClick={() => setSelectedWord(null)}></div>

                            {/* Card */}
                            <div className="pointer-events-auto w-full md:w-[420px] bg-bg-paper border-t md:border border-ink-faint shadow-2xl overflow-hidden flex flex-col max-h-[70vh] md:max-h-[85vh]">
                                {/* Header */}
                                <div className="p-4 border-b border-ink-faint flex items-center justify-between bg-bg-elevated shrink-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl font-serif font-bold text-ink">{selectedWord}</span>
                                        <button
                                            onClick={() => playAudio(selectedWord)}
                                            className="text-neon-green hover:text-white transition-colors"
                                        >
                                            <Volume2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button onClick={() => setSelectedWord(null)} className="text-ink-muted hover:text-red-500 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content - Using DictionaryResults */}
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    {isInspecting ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-ink-muted space-y-3">
                                            <Loader2 className="w-6 h-6 animate-spin text-neon-green" />
                                            <span className="text-xs uppercase tracking-widest">Consulting Dictionary...</span>
                                        </div>
                                    ) : inspectorData?.found && inspectorData?.entries?.length > 0 ? (
                                        <DictionaryResults
                                            word={selectedWord}
                                            source="LDOCE"
                                            entries={inspectorData.entries}
                                        />
                                    ) : inspectorData?.found === false ? (
                                        <div className="text-ink-muted text-center py-8">
                                            <p className="text-lg mb-2">Word not found</p>
                                            <p className="text-sm">"{selectedWord}" is not in LDOCE dictionary.</p>
                                        </div>
                                    ) : (
                                        <div className="text-neon-pink text-center text-sm py-8">Failed to load definition</div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 border-t border-ink-faint bg-bg-elevated shrink-0">
                                    <Button
                                        variant="primary"
                                        fullWidth
                                        icon={Bookmark}
                                        className="shadow-hard"
                                    >
                                        ADD TO REVIEW PLAN
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default ReadingMode;
