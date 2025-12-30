import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { BookOpen, ChevronLeft, Volume2, Loader2, X, Zap, Bookmark, ZoomIn } from 'lucide-react';
import DictionaryResults from '../components/aui/DictionaryResults';
import ReadingTracker from '../utils/ReadingTracker';

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
                        className={`reading-word cursor-pointer px-0.5 ${isHighlighted
                            ? 'text-[#00FF94] border-b border-[#00FF94]/50'
                            : 'hover:text-[#00FF94] hover:bg-[#00FF94]/10'
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
 * Memoized Image Component - Lazy loading with click-to-zoom
 */
const MemoizedImage = memo(function MemoizedImage({ src, alt, caption, onImageClick }) {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const imgRef = useRef(null);

    // Lazy loading with Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && imgRef.current) {
                    imgRef.current.src = src;
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [src]);

    if (error) return null;

    return (
        <figure className="my-8 group">
            <div
                className="relative bg-[#111] border border-[#333] overflow-hidden cursor-pointer
                           hover:border-[#00FF94] transition-colors"
                onClick={() => onImageClick(src, alt, caption)}
            >
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]">
                        <Loader2 className="w-6 h-6 animate-spin text-[#666]" />
                    </div>
                )}
                <img
                    ref={imgRef}
                    alt={alt || ''}
                    className={`w-full h-auto transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setError(true)}
                />
                {/* Zoom icon overlay */}
                <div className="absolute bottom-2 right-2 p-2 bg-black/50 text-[#00FF94] opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-4 h-4" />
                </div>
            </div>
            {caption && (
                <figcaption className="mt-2 text-sm text-[#888] font-mono italic px-2">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
});

/**
 * Lightbox Component - Full-screen image viewer
 */
const Lightbox = memo(function Lightbox({ src, alt, caption, onClose }) {
    // Close on ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                className="absolute top-4 right-4 p-3 text-white/70 hover:text-white border border-white/20 hover:border-white/50 transition-colors"
                onClick={onClose}
            >
                <X className="w-6 h-6" />
            </button>

            {/* Image container */}
            <div
                className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt={alt || ''}
                    className="max-w-full max-h-[80vh] object-contain border border-[#333]"
                />
                {caption && (
                    <p className="mt-4 text-center text-[#888] font-mono text-sm max-w-xl">
                        {caption}
                    </p>
                )}
            </div>

            {/* Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#666] text-xs font-mono">
                Press ESC or click outside to close
            </div>
        </div>
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

    // Track sentence visibility for reading stats
    useEffect(() => {
        if (!selectedArticle?.sentences || !trackerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && trackerRef.current) {
                        const idx = parseInt(entry.target.dataset.sentenceIdx, 10);
                        if (!isNaN(idx)) {
                            trackerRef.current.onSentenceView(idx);
                        }
                    }
                });
            },
            { rootMargin: '0px', threshold: 0.5 }
        );

        // Observe all sentence elements
        const sentenceEls = document.querySelectorAll('[data-sentence-idx]');
        sentenceEls.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [selectedArticle?.sentences?.length, visibleCount]);

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

        // Track word click for reading quality
        if (trackerRef.current) {
            trackerRef.current.onWordClick();
        }
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
            <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-mono selection:bg-[#00FF94] selection:text-black">
                {/* GLOBAL NOISE TEXTURE OVERLAY */}
                <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

                {/* HEADER SECTION */}
                <header className="border-b border-[#333] px-6 md:px-12 py-8 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-6 h-6 bg-[#00FF94] flex items-center justify-center">
                                <BookOpen size={16} className="text-black" />
                            </div>
                            <span className="text-[#00FF94] text-xs font-bold tracking-[0.3em] uppercase">Reading Mode</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                            Article <span className="italic text-[#333]">/</span> Library
                        </h1>
                    </div>
                    <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#111] border border-[#333]">
                        <BookOpen size={14} className="text-[#666]" />
                        <div className="flex flex-col">
                            <span className="text-[10px] text-[#666] uppercase tracking-wider leading-none">Articles</span>
                            <span className="text-sm font-bold text-white font-mono leading-none mt-1">{articles.length}</span>
                        </div>
                    </div>
                </header>

                <main className="px-6 md:px-12 py-12">
                    {isLoading && articles.length === 0 ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#888]" /></div>
                    ) : (
                        <>
                            {/* Section Header */}
                            <h2 className="text-sm font-bold text-[#666] uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                                01. Available Articles
                                <div className="h-[1px] bg-[#333] flex-grow"></div>
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl">
                                {articles.map((article, idx) => (
                                    <button
                                        key={article.source_id}
                                        onClick={() => loadArticle(article.source_id, selectedOptionIndex)}
                                        className="group relative flex flex-col items-start text-left p-8 bg-[#0A0A0A] border border-[#333] hover:border-[#00FF94] transition-colors duration-300"
                                    >
                                        {/* Corner Index */}
                                        <div className="absolute top-0 right-0 p-2 opacity-50 text-xs font-mono text-[#666]">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>

                                        <div className="flex items-center gap-2 mb-6 w-full">
                                            <span className="px-2 py-0.5 bg-[#00FF94] text-black text-[10px] font-bold uppercase tracking-wider">
                                                Chapter {idx + 1}
                                            </span>
                                            <div className="h-[1px] bg-[#333] flex-1 group-hover:bg-[#00FF94]/30 transition-colors"></div>
                                        </div>

                                        <h3 className="text-xl font-serif font-bold text-white group-hover:text-[#00FF94] transition-colors mb-4 line-clamp-2 leading-snug">
                                            {article.title}
                                        </h3>

                                        <p className="text-sm text-[#888] line-clamp-3 leading-relaxed font-mono mb-6">
                                            {article.preview}
                                        </p>

                                        {/* Footer with action hint */}
                                        <div className="mt-auto pt-4 border-t border-[#333] w-full flex justify-end">
                                            <span className="text-[#00FF94] text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                Read Now <ChevronLeft size={12} className="rotate-180" />
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </main>
            </div>
        );
    }

    // 2. Reading View
    return (
        <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono selection:bg-[#00FF94] selection:text-black">
            {/* GLOBAL NOISE TEXTURE OVERLAY */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* Toolbar - Industrial Style */}
            <header className="h-14 border-b border-[#333] flex items-center justify-between px-4 md:px-8 bg-[#0A0A0A] shrink-0 z-20">
                <button
                    onClick={async () => {
                        // End reading session before going back
                        if (trackerRef.current) {
                            const result = await trackerRef.current.end();
                            console.log('[ReadingMode] Session ended:', result);
                            trackerRef.current = null;
                        }
                        setSelectedArticle(null);
                        setSelectedWord(null);
                    }}
                    className="flex items-center gap-2 text-[#888] hover:text-[#00FF94] transition-colors group"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Library</span>
                </button>

                {/* Highlight Controls */}
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <select
                            value={selectedOptionIndex}
                            onChange={(e) => setSelectedOptionIndex(Number(e.target.value))}
                            className="bg-[#111] border border-[#333] text-[#E0E0E0] text-xs font-mono font-bold uppercase py-2 pl-3 pr-8 focus:outline-none focus:border-[#00FF94] appearance-none cursor-pointer transition-colors hover:border-[#666]"
                        >
                            {HIGHLIGHT_OPTIONS.map((opt, i) => (
                                <option key={i} value={i}>{opt.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-[#666] group-hover:text-[#00FF94]">
                            <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
                        </div>
                    </div>

                    <button
                        onClick={() => setShowHighlights(!showHighlights)}
                        className={`p-2 border transition-all duration-200 ${showHighlights
                            ? 'border-[#00FF94] text-[#00FF94] bg-[#00FF94]/10'
                            : 'border-[#333] text-[#666] hover:text-[#E0E0E0] hover:border-[#666]'}`}
                        title="Toggle Highlights"
                    >
                        <Zap className="w-4 h-4 fill-current" />
                    </button>
                </div>

                {/* Right section - Stats */}
                <div className="hidden md:flex items-center gap-2">
                    <span className="text-[10px] text-[#666] uppercase tracking-wider">{selectedArticle.sentence_count} Sentences</span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Article Text */}
                <main ref={mainRef} className="flex-1 overflow-y-auto px-4 md:px-0 py-12 scroll-smooth custom-scrollbar">
                    <article className="max-w-2xl mx-auto pb-32">
                        {/* Article Header - Cyber-Noir Style */}
                        <header className="mb-12 px-4">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-2 py-0.5 bg-[#00FF94] text-black text-[10px] font-bold uppercase tracking-wider">
                                    Reading
                                </span>
                                <div className="h-[1px] bg-[#333] flex-1"></div>
                            </div>
                            <h1 className="font-serif text-3xl md:text-4xl text-white mb-4 leading-tight">
                                {selectedArticle.title}
                            </h1>
                            <div className="flex items-center gap-4 text-xs text-[#666] font-mono">
                                <span>{selectedArticle.sentence_count} sentences</span>
                                <span className="text-[#333]">/</span>
                                <span>{selectedArticle.metadata?.filename?.split('.').slice(0, 2).join(' ')}</span>
                            </div>
                        </header>


                        {/* Event delegation + CSS containment for performance */}
                        <div
                            className="prose prose-invert prose-lg max-w-none font-serif md:text-xl leading-loose text-[#CCC] px-4"
                            style={{ contain: 'content' }}
                            data-selected-word={selectedWord || ''}
                            onClick={handleArticleClick}
                        >
                            {/* Progressive loading with interleaved images */}
                            {(() => {
                                const elements = [];
                                const images = selectedArticle.images || [];
                                const imagesByIndex = {};

                                // Group images by sentence_index for O(1) lookup
                                images.forEach(img => {
                                    if (!imagesByIndex[img.sentence_index]) {
                                        imagesByIndex[img.sentence_index] = [];
                                    }
                                    imagesByIndex[img.sentence_index].push(img);
                                });

                                // Build filename for image URL
                                const filename = selectedArticle.metadata?.filename || '';

                                // Interleave sentences and images
                                selectedArticle.sentences?.slice(0, visibleCount).forEach((sentence, idx) => {
                                    // Add sentence wrapper with tracking attribute
                                    elements.push(
                                        <div key={`s-${idx}`} data-sentence-idx={idx}>
                                            <MemoizedSentence
                                                text={sentence.text}
                                                highlightSet={selectedArticle.highlightSet}
                                                showHighlights={showHighlights}
                                            />
                                        </div>
                                    );

                                    // Add images that should appear after this sentence
                                    if (imagesByIndex[idx]) {
                                        imagesByIndex[idx].forEach((img, imgIdx) => {
                                            const imgUrl = `/api/reading/epub/image?filename=${encodeURIComponent(filename)}&image_path=${encodeURIComponent(img.path)}`;
                                            elements.push(
                                                <MemoizedImage
                                                    key={`i-${idx}-${imgIdx}`}
                                                    src={imgUrl}
                                                    alt={img.alt}
                                                    caption={img.caption}
                                                    onImageClick={(src, alt, caption) => setLightboxImage({ src, alt, caption })}
                                                />
                                            );
                                        });
                                    }
                                });

                                return elements;
                            })()}

                            {/* Sentinel element for Intersection Observer */}
                            {visibleCount < (selectedArticle.sentences?.length || 0) && (
                                <div
                                    ref={sentinelRef}
                                    className="flex justify-center py-4 text-[#666]"
                                >
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="ml-2 text-xs font-mono">Loading more...</span>
                                </div>
                            )}
                        </div>
                    </article>
                </main>

                {/* Inspector Panel - Cyber-Noir Style */}
                {
                    selectedWord && (
                        <div className="fixed inset-0 z-[60] pointer-events-none flex flex-col justify-end md:justify-center md:items-end md:pr-8">
                            {/* Backdrop for mobile only */}
                            <div className="absolute inset-0 bg-black/80 md:bg-black/50 pointer-events-auto" onClick={() => setSelectedWord(null)}></div>

                            {/* Card - Sharp Industrial Style */}
                            <div className="pointer-events-auto relative w-full md:w-[420px] bg-[#0A0A0A] border-t md:border border-[#333] md:shadow-[4px_4px_0px_0px_rgba(0,255,148,0.2)] overflow-hidden flex flex-col max-h-[80vh] md:max-h-[85vh]">
                                {/* Header */}
                                <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#111] shrink-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl font-serif font-bold text-white">{selectedWord}</span>
                                        <button
                                            onClick={() => playAudio(selectedWord)}
                                            className="w-8 h-8 flex items-center justify-center border border-[#333] text-[#00FF94] hover:bg-[#00FF94] hover:text-black transition-colors"
                                        >
                                            <Volume2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setSelectedWord(null)}
                                        className="w-8 h-8 flex items-center justify-center border border-[#333] text-[#666] hover:border-[#FF0055] hover:text-[#FF0055] transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Content - Using DictionaryResults */}
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    {isInspecting ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-[#666] space-y-3">
                                            <Loader2 className="w-6 h-6 animate-spin text-[#00FF94]" />
                                            <span className="text-xs uppercase tracking-widest font-mono">Consulting Dictionary...</span>
                                        </div>
                                    ) : inspectorData?.found && inspectorData?.entries?.length > 0 ? (
                                        <DictionaryResults
                                            word={selectedWord}
                                            source="LDOCE"
                                            entries={inspectorData.entries}
                                        />
                                    ) : inspectorData?.found === false ? (
                                        <div className="text-[#888] text-center py-8">
                                            <p className="text-lg mb-2 font-serif">Word not found</p>
                                            <p className="text-sm font-mono">"{selectedWord}" is not in LDOCE dictionary.</p>
                                        </div>
                                    ) : (
                                        <div className="text-[#FF0055] text-center text-sm py-8 font-mono">Failed to load definition</div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="p-4 border-t border-[#333] bg-[#111] shrink-0">
                                    <button className="w-full bg-[#E0E0E0] text-black py-3 font-mono text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] transition-all active:translate-y-[2px]">
                                        <Bookmark className="w-4 h-4" />
                                        Add to Review Plan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <Lightbox
                    src={lightboxImage.src}
                    alt={lightboxImage.alt}
                    caption={lightboxImage.caption}
                    onClose={() => setLightboxImage(null)}
                />
            )}
        </div>
    );
};

export default ReadingMode;
