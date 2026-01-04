import React, { useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, Zap, Loader2, CheckCheck, GraduationCap } from 'lucide-react';
import MemoizedSentence from './MemoizedSentence';
import MemoizedImage from './MemoizedImage';
import { HIGHLIGHT_OPTIONS, BATCH_SIZE } from './constants';

/**
 * Reader View - Immersive article reading with word inspection
 */
const ReaderView = ({
    article,
    visibleCount,
    setVisibleCount,
    selectedOptionIndex,
    setSelectedOptionIndex,
    showHighlights,
    setShowHighlights,
    selectedWord,
    onWordClick,
    onBackToLibrary,
    onImageClick,
    onSweep,
    trackerRef,
    calibrationBanner
}) => {
    const mainRef = useRef(null);
    const sentinelRef = useRef(null);

    // Progressive loading: Intersection Observer to load more sentences
    useEffect(() => {
        if (!article?.sentences) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisibleCount(prev =>
                        Math.min(prev + BATCH_SIZE, article.sentences.length)
                    );
                }
            },
            { rootMargin: '200px' }
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [article?.sentences?.length, setVisibleCount]);

    // Track sentence visibility for reading stats
    useEffect(() => {
        if (!article?.sentences || !trackerRef?.current) return;

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

        const sentenceEls = document.querySelectorAll('[data-sentence-idx]');
        sentenceEls.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [article?.sentences?.length, visibleCount, trackerRef]);

    // Event delegation: handle clicks on article container
    const handleArticleClick = useCallback((e) => {
        const target = e.target;
        const word = target.dataset?.word;
        const sentence = target.dataset?.sentence;

        if (!word) return;

        const cleanWord = word.toLowerCase();
        if (cleanWord.length < 2) return;

        onWordClick(cleanWord, sentence || '');

        // Track word click for reading quality
        if (trackerRef?.current) {
            trackerRef.current.onWordClick();
        }
    }, [onWordClick, trackerRef]);

    // Build elements for rendering
    const renderContent = () => {
        const elements = [];
        const images = article.images || [];
        const imagesByIndex = {};

        images.forEach(img => {
            if (!imagesByIndex[img.sentence_index]) {
                imagesByIndex[img.sentence_index] = [];
            }
            imagesByIndex[img.sentence_index].push(img);
        });

        const filename = article.metadata?.filename || '';

        article.sentences?.slice(0, visibleCount).forEach((sentence, idx) => {
            elements.push(
                <div key={`s-${idx}`} data-sentence-idx={idx}>
                    <MemoizedSentence
                        text={sentence.text}
                        highlightSet={article.highlightSet}
                        studyHighlightSet={article.studyHighlightSet}
                        showHighlights={showHighlights}
                    />
                </div>
            );

            if (imagesByIndex[idx]) {
                imagesByIndex[idx].forEach((img, imgIdx) => {
                    const imgUrl = `/api/reading/epub/image?filename=${encodeURIComponent(filename)}&image_path=${encodeURIComponent(img.path)}`;
                    elements.push(
                        <MemoizedImage
                            key={`i-${idx}-${imgIdx}`}
                            src={imgUrl}
                            alt={img.alt}
                            caption={img.caption}
                            onImageClick={onImageClick}
                        />
                    );
                });
            }
        });

        return elements;
    };

    return (
        <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono selection:bg-[#00FF94] selection:text-black">
            {/* GLOBAL NOISE TEXTURE OVERLAY */}
            <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

            {/* Calibration Suggestion Banner */}
            {calibrationBanner && (
                <div className="bg-[#00FF94]/10 border-b border-[#00FF94]/30 px-4 py-2 text-center text-xs text-[#00FF94] font-mono">
                    {calibrationBanner}
                </div>
            )}

            {/* Toolbar - Industrial Style */}
            <header className="h-14 border-b border-[#333] flex items-center justify-between px-4 md:px-8 bg-[#0A0A0A] shrink-0 z-20">
                <button
                    onClick={onBackToLibrary}
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

                {/* Sweep Button */}
                <button
                    onClick={onSweep}
                    className="ml-2 flex items-center gap-2 px-3 py-1.5 border border-[#333] text-[#666] hover:text-[#00FF94] hover:border-[#00FF94] hover:bg-[#00FF94]/5 transition-all group"
                    title="Mark Remaining as Known"
                >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Sweep</span>
                </button>

                {/* Deep Study Button - Cross-mode navigation */}
                <button
                    onClick={() => {
                        window.location.href = `/sentence-study?source_id=${encodeURIComponent(article.id)}`;
                    }}
                    className="ml-2 flex items-center gap-2 px-3 py-1.5 border border-[#333] text-[#666] hover:text-[#00FF94] hover:border-[#00FF94] hover:bg-[#00FF94]/5 transition-all group"
                    title="Study this article sentence by sentence"
                >
                    <GraduationCap className="w-4 h-4" />
                    <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Deep Study</span>
                </button>

                {/* Right section - Stats */}
                <div className="hidden md:flex items-center gap-2 ml-auto">
                    <span className="text-[10px] text-[#666] uppercase tracking-wider">{article.sentence_count} Sentences</span>
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
                                {article.title}
                            </h1>
                            <div className="flex items-center gap-4 text-xs text-[#666] font-mono">
                                <span>{article.sentence_count} sentences</span>
                                <span className="text-[#333]">/</span>
                                <span>{article.metadata?.filename?.split('.').slice(0, 2).join(' ')}</span>
                            </div>
                        </header>

                        {/* Event delegation + CSS containment for performance */}
                        <div
                            className="prose prose-invert prose-lg max-w-none font-serif md:text-xl leading-loose text-[#CCC] px-4"
                            style={{ contain: 'content' }}
                            data-selected-word={selectedWord || ''}
                            onClick={handleArticleClick}
                        >
                            {renderContent()}

                            {/* Sentinel element for Intersection Observer */}
                            {visibleCount < (article.sentences?.length || 0) && (
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
            </div>
        </div>
    );
};

export default ReaderView;
