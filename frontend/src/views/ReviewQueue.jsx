/**
 * ReviewQueue View - SM-2 Spaced Repetition Review System
 * 
 * A card-based review interface that implements the SM-2 algorithm.
 * Features:
 * - Flip-card UI showing sentence with highlighted words
 * - 3 rating buttons: Forgot (1), Remembered (3), Easy (5)
 * - Progress tracking and empty state
 * - Clickable words in help panel for dictionary lookup
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    RotateCcw,
    CheckCircle,
    Zap,
    Loader2,
    BookOpen,
    RefreshCw,
    Clock,
    SkipForward,
    Volume2
} from 'lucide-react';

import ExplanationCard from '../components/sentence-study/views/ExplanationCard';
import { getGapTypeInfo } from '../components/sentence-study/constants';
import useWordExplainer from '../hooks/useWordExplainer';
import WordInspector from '../components/reading/WordInspector';

// API helpers for SM-2 review system
const api = {
    async getQueue(userId = 'default_user', limit = 20) {
        const res = await fetch(`/api/review/queue?user_id=${userId}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch review queue');
        return res.json();
    },
    async getRandomQueue(userId = 'default_user', limit = 20) {
        const res = await fetch(`/api/review/random?user_id=${userId}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch random queue');
        return res.json();
    },
    async complete(itemId, quality, durationMs = 0) {
        const res = await fetch('/api/review/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId, quality, duration_ms: durationMs })
        });
        if (!res.ok) throw new Error('Failed to complete review');
        return res.json();
    },
    async getStats(userId = 'default_user') {
        const res = await fetch(`/api/review/stats?user_id=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
    },
    async getContext(itemId) {
        const res = await fetch(`/api/review/context/${itemId}`);
        if (!res.ok) throw new Error('Failed to fetch context');
        return res.json();
    }
};



// Rating options per design spec (SM-2 quality scores)
const RATING_OPTIONS = [
    {
        quality: 1,
        label: '忘了',
        icon: RotateCcw,
        color: 'text-accent-danger',
        bgColor: 'bg-accent-danger/10',
        hoverBg: 'hover:bg-accent-danger/20',
        borderColor: 'border-accent-danger/30'
    },
    {
        quality: 3,
        label: '想起来了',
        icon: CheckCircle,
        color: 'text-accent-primary',
        bgColor: 'bg-accent-primary/10',
        hoverBg: 'hover:bg-accent-primary/20',
        borderColor: 'border-accent-primary/30'
    },
    {
        quality: 5,
        label: '太简单',
        icon: Zap,
        color: 'text-accent-warning',
        bgColor: 'bg-accent-warning/10',
        hoverBg: 'hover:bg-accent-warning/20',
        borderColor: 'border-accent-warning/30'
    }
];

// Highlight words in sentence - supports clickable mode for dictionary lookup
const HighlightedSentence = ({ text, highlights = [], clickable = false, onWordClick, sentence }) => {
    if (!highlights || highlights.length === 0) {
        return <span>{text}</span>;
    }

    // Build regex pattern from highlights
    const pattern = highlights
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => {
                const isHighlight = highlights.some(
                    h => h.toLowerCase() === part.toLowerCase()
                );
                return isHighlight ? (
                    <mark
                        key={i}
                        className={`bg-category-amber/30 text-category-amber px-1 rounded ${clickable
                            ? 'cursor-pointer hover:bg-category-amber/50 transition-colors animate-[pulse-highlight_1.5s_ease-in-out_2]'
                            : ''
                            }`}
                        style={clickable ? {
                            animation: 'pulse-highlight 0.6s ease-in-out 3'
                        } : undefined}
                        onClick={clickable && onWordClick ? (e) => {
                            e.stopPropagation();
                            onWordClick(part, sentence || text);
                        } : undefined}
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                );
            })}
            {/* Inject keyframes for pulse animation */}
            {clickable && (
                <style>{`
                    @keyframes pulse-highlight {
                        0%, 100% { background-color: rgba(245, 158, 11, 0.3); }
                        50% { background-color: rgba(245, 158, 11, 0.7); box-shadow: 0 0 8px rgba(245, 158, 11, 0.6); }
                    }
                `}</style>
            )}
        </>
    );
};

const ReviewQueue = () => {
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ total_items: 0, due_items: 0, total_reviews: 0 });
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastResult, setLastResult] = useState(null);
    const [isRandomMode, setIsRandomMode] = useState(false);

    // Context state
    const [contextData, setContextData] = useState(null);
    const [showContext, setShowContext] = useState(false);
    const [loadingContext, setLoadingContext] = useState(false);


    // Help panel state
    const [showHelpPanel, setShowHelpPanel] = useState(false);
    const [helpStage, setHelpStage] = useState(1);
    const [helpContent, setHelpContent] = useState('');
    const [isLoadingHelp, setIsLoadingHelp] = useState(false);
    const helpRequestIdRef = useRef(0);
    const helpContainerRef = useRef(null);

    // Word explainer hook for dictionary lookup in help panel
    const {
        selectedWord: inspectedWord,
        inspectorData,
        isInspecting,
        contextExplanation: wordExplanation,
        isExplaining: isExplainingWord,
        isPhrase,
        explainStyle,
        handleWordClick,
        closeInspector,
        changeExplainStyle,
        generatedImage,
        isGeneratingImage
    } = useWordExplainer();

    // Audio ref
    const audioRef = useRef(null);

    // Timer state
    const [startTime, setStartTime] = useState(Date.now());

    // Load queue and stats
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [queueData, statsData] = await Promise.all([
                    api.getQueue(),
                    api.getStats()
                ]);
                setQueue(queueData.items || []);
                setStats(statsData);
            } catch (e) {
                console.error('Failed to load review data:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Current item
    const currentItem = queue[currentIndex];

    // Reset timer when item changes
    useEffect(() => {
        if (currentItem) {
            setStartTime(Date.now());
        }
    }, [currentItem]);

    // Start random review
    const startRandomReview = async () => {
        setLoading(true);
        try {
            const queueData = await api.getRandomQueue();
            setQueue(queueData.items || []);
            setIsRandomMode(true);
            setCurrentIndex(0);
            setLastResult(null);
            setContextData(null);
            setShowContext(false);
        } catch (e) {
            console.error('Failed to start random review:', e);
        } finally {
            setLoading(false);
        }
    };

    // Play TTS
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

    // Handle rating selection
    const handleRating = useCallback(async (quality) => {
        if (!currentItem || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // In random mode, we don't submit to backend
            if (isRandomMode) {
                // Just delay slightly for UI feedback
                await new Promise(r => setTimeout(r, 300));

                // Move next
                if (currentIndex < queue.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                    setLastResult(null);
                } else {
                    // Refetch random or show empty? 
                    // Let's go back to empty state to allow choice
                    setQueue([]);
                    setLastResult(null);
                }
                return;
            }

            const duration = Date.now() - startTime;
            const result = await api.complete(currentItem.id, quality, duration);
            setLastResult(result);

            // Reset help panel and context state
            setShowHelpPanel(false);
            setHelpStage(1);
            setHelpContent('');
            setContextData(null);
            setShowContext(false);

            // Move to next item or finish
            if (currentIndex < queue.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // All done - reload queue
                const queueData = await api.getQueue();
                setQueue(queueData.items || []);
                setCurrentIndex(0);
            }
        } catch (e) {
            console.error('Failed to submit review:', e);
        } finally {
            setIsSubmitting(false);
        }
    }, [currentItem, currentIndex, queue.length, isSubmitting, isRandomMode, startTime]);

    // Stream explanation content
    const streamExplanation = useCallback(async (stage) => {
        if (!currentItem) return;

        const currentRequestId = ++helpRequestIdRef.current;
        setIsLoadingHelp(true);
        setHelpContent('');
        setHelpStage(stage);

        const hasHighlights = currentItem.highlighted_items?.length > 0;

        try {
            let res;
            if (hasHighlights) {
                // Explain highlighted items in sentence context
                const text = currentItem.highlighted_items.join(', ');
                res = await fetch('/api/sentence-study/explain-word', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text,
                        sentence: currentItem.sentence_text,
                        style: stage === 1 ? 'brief' : stage === 2 ? 'default' : 'detailed'
                    })
                });
            } else {
                // Explain whole sentence
                res = await fetch('/api/sentence-study/simplify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sentence: currentItem.sentence_text,
                        simplify_type: 'meaning',
                        stage
                    })
                });
            }

            if (helpRequestIdRef.current !== currentRequestId) return;
            if (!res.ok) throw new Error('Failed to fetch explanation');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let streamedText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (helpRequestIdRef.current !== currentRequestId) {
                    reader.cancel();
                    return;
                }
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    if (helpRequestIdRef.current !== currentRequestId) return;
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]' || data.startsWith('[ERROR]')) break;
                        // Handle both JSON and plain text formats
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'chunk') {
                                streamedText += parsed.content;
                                setHelpContent(streamedText);
                            }
                        } catch {
                            // Plain text format from explain-word
                            // Decode [NL] markers back to newlines
                            const decoded = data.replace(/\[NL\]/g, '\n');
                            streamedText += decoded;
                            setHelpContent(streamedText);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Stream explanation error:', e);
            if (helpRequestIdRef.current === currentRequestId) {
                setHelpContent('加载失败，请重试');
            }
        } finally {
            if (helpRequestIdRef.current === currentRequestId) {
                setIsLoadingHelp(false);
            }
        }
    }, [currentItem]);

    // Auto-scroll help content
    useEffect(() => {
        if (helpContainerRef.current) {
            helpContainerRef.current.scrollTop = helpContainerRef.current.scrollHeight;
        }
    }, [helpContent]);

    // Handle "Forgot" button - open help panel
    const handleForgot = useCallback(() => {
        setShowHelpPanel(true);
        streamExplanation(1);
    }, [streamExplanation]);

    // Handle help response (remembered or still unclear)
    const handleHelpResponse = useCallback(async (remembered) => {
        if (remembered) {
            // User remembered after help - quality 2
            await handleRating(2);
        } else if (helpStage < 3) {
            // Show next stage
            streamExplanation(helpStage + 1);
        } else {
            // Stage 3 exhausted - quality 1
            await handleRating(1);
        }
    }, [helpStage, handleRating, streamExplanation]);

    // Handle skip (don't want help)
    const handleSkipHelp = useCallback(async () => {
        await handleRating(1);
    }, [handleRating]);

    // Toggle context visibility
    const toggleContext = useCallback(async () => {
        if (showContext) {
            setShowContext(false);
            return;
        }

        if (contextData) {
            setShowContext(true);
            return;
        }

        setLoadingContext(true);
        try {
            const data = await api.getContext(currentItem.id);
            setContextData(data);
            setShowContext(true);
        } catch (e) {
            console.error('Failed to fetch context:', e);
        } finally {
            setLoadingContext(false);
        }
    }, [currentItem, contextData, showContext]);

    // Refresh queue
    const refreshQueue = useCallback(async () => {
        setLoading(true);
        setIsRandomMode(false); // Reset random mode
        try {
            const [queueData, statsData] = await Promise.all([
                api.getQueue(),
                api.getStats()
            ]);
            setQueue(queueData.items || []);
            setStats(statsData);
            setCurrentIndex(0);
            setLastResult(null);
            setContextData(null);
            setShowContext(false);
        } catch (e) {
            console.error('Failed to refresh:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Render empty state
    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center flex-1 px-4">
            <div className="w-20 h-20 rounded-full bg-accent-primary/10 flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-accent-primary" />
            </div>
            <h2 className="text-xl font-serif text-white mb-2">暂无待复习内容</h2>
            <p className="text-text-secondary text-sm text-center max-w-xs">
                太棒了！你已经完成了所有复习任务。继续学习新内容吧！
            </p>
            <div className="mt-8 space-y-3 text-center flex flex-col items-center">
                <button
                    onClick={startRandomReview}
                    className="flex items-center gap-2 px-6 py-2 bg-accent-primary/10 text-accent-primary rounded-full hover:bg-accent-primary/20 transition-all border border-accent-primary/30"
                >
                    <Zap className="w-4 h-4" />
                    开始随机复习
                </button>
                <button
                    onClick={refreshQueue}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-accent-primary transition-colors mt-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    刷新队列
                </button>
            </div>
        </div>
    );

    // Render stats header
    const renderStats = () => (
        <div className="flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>{stats.total_items} 总项</span>
            </div>
            <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{queue.length} 待复习</span>
            </div>
            {isRandomMode && (
                <div className="px-2 py-0.5 bg-accent-info/20 text-accent-info text-[10px] rounded uppercase tracking-wider font-bold">
                    Random Mode
                </div>
            )}
        </div>
    );

    // Render review card
    const renderReviewCard = () => {
        if (!currentItem) return null;

        // Extract source info for display
        const sourceInfo = currentItem.source_id.split(':');
        const bookName = sourceInfo[1] || 'Unknown';

        return (
            <div className="flex-1 flex flex-col px-4 py-6 max-w-2xl mx-auto w-full">
                {/* Progress */}
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-text-muted">
                        {currentIndex + 1} / {queue.length}
                    </span>
                    {renderStats()}
                </div>

                {/* Card */}
                <div className="flex-1 flex flex-col border border-border bg-bg-surface">
                    {/* Source tag */}
                    <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="px-1.5 py-0.5 bg-accent-primary/10 text-accent-primary rounded text-[11px] truncate max-w-[120px] sm:max-w-none" title={bookName}>
                                📖 {bookName}
                            </span>
                            <span className="px-1.5 py-0.5 bg-accent-info/10 text-accent-info rounded text-[11px] whitespace-nowrap flex-shrink-0">
                                🏷️ {getGapTypeInfo(currentItem.difficulty_type).shortLabel}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => playAudio(currentItem.sentence_text)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded transition-colors whitespace-nowrap flex-shrink-0 bg-bg-elevated text-text-secondary hover:text-white border border-transparent"
                                title="播放发音"
                            >
                                <Volume2 className="w-3 h-3" />
                                <span>发音</span>
                            </button>

                            {/* Context Toggle Button */}
                            <button
                                onClick={toggleContext}
                                disabled={loadingContext}
                                className={`
                                    flex items-center gap-1 px-2 py-0.5 rounded transition-colors whitespace-nowrap flex-shrink-0
                                    ${showContext
                                        ? 'bg-accent-info/20 text-accent-info border border-accent-info/30'
                                        : 'bg-bg-elevated text-text-secondary hover:text-text-primary border border-transparent'}
                                `}
                            >
                                {loadingContext ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <BookOpen className="w-3 h-3" />
                                )}
                                <span>上下文</span>
                            </button>
                        </div>
                    </div>

                    {/* Context View (Expanded) */}
                    {showContext && contextData && (
                        <div className="px-6 py-4 bg-bg-elevated border-b border-border-subtle text-sm leading-relaxed text-text-secondary">
                            {contextData.previous_sentence && (
                                <p className="mb-2 opacity-60">{contextData.previous_sentence}</p>
                            )}
                            <div className="pl-2 border-l-2 border-accent-info/50 my-2 text-text-primary">
                                <HighlightedSentence
                                    text={contextData.target_sentence}
                                    highlights={currentItem.highlighted_items || []}
                                />
                            </div>
                            {contextData.next_sentence && (
                                <p className="mt-2 opacity-60">{contextData.next_sentence}</p>
                            )}
                        </div>
                    )}

                    {/* Sentence (Main View) - Clickable when help panel is open */}
                    <div
                        className="flex-1 flex items-center justify-center p-6 md:p-10"
                    >
                        <div className="w-full">
                            {/* Hint when sentence is clickable */}
                            {showHelpPanel && currentItem?.highlighted_items?.length > 0 && (
                                <p className="text-xs text-accent-primary mb-2 font-mono uppercase tracking-wider">👆 点击高亮词查看释义</p>
                            )}
                            <p className={`font-serif text-xl md:text-2xl text-text-primary leading-relaxed text-left ${showContext ? 'opacity-50' : ''}`}>
                                <HighlightedSentence
                                    text={currentItem.sentence_text}
                                    highlights={currentItem.highlighted_items || []}
                                    clickable={showHelpPanel}
                                    onWordClick={handleWordClick}
                                    sentence={currentItem.sentence_text}
                                />
                            </p>
                        </div>
                    </div>

                    {/* Interval info */}
                    <div className="px-4 py-2 border-t border-border-subtle text-xs text-text-muted text-center">
                        {currentItem.repetition > 0 ? (
                            <span>
                                已复习 {currentItem.repetition} 次 · 上次间隔 {Math.round(currentItem.interval_days)} 天
                            </span>
                        ) : (
                            <span>首次复习</span>
                        )}
                        {isRandomMode && (
                            <span className="block mt-1 text-accent-info/70">
                                (随机复习模式 - 不记录进度)
                            </span>
                        )}
                    </div>
                </div>

                {/* Help Panel (shown when user clicks 'Forgot') */}
                {showHelpPanel ? (
                    <div className="mt-6">
                        <ExplanationCard
                            simplifiedText={helpContent}
                            simplifyStage={helpStage}
                            isSimplifying={isLoadingHelp}
                            onSimplifiedResponse={handleHelpResponse}
                        />

                        {/* Skip button below card */}
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={handleSkipHelp}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-text-secondary transition-colors text-xs opacity-60 hover:opacity-100"
                            >
                                <SkipForward className="w-3 h-3" />
                                <span>跳过，下一个</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Rating buttons (normal state) */
                    <div className="mt-6 grid grid-cols-3 gap-3">
                        {RATING_OPTIONS.map(option => {
                            const Icon = option.icon;
                            // Override "Forgot" button to trigger help panel
                            const handleClick = option.quality === 1
                                ? handleForgot
                                : () => handleRating(option.quality);
                            return (
                                <button
                                    key={option.quality}
                                    onClick={handleClick}
                                    disabled={isSubmitting}
                                    className={`
                                        flex flex-col items-center gap-2 p-4 min-h-[80px]
                                        border ${option.borderColor} ${option.bgColor} ${option.hoverBg}
                                        transition-all disabled:opacity-50
                                        active:scale-95
                                    `}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                                    ) : (
                                        <>
                                            <Icon className={`w-6 h-6 ${option.color}`} />
                                            <span className={`text-sm ${option.color}`}>
                                                {option.label}
                                            </span>
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Last result feedback */}
                {lastResult && !isRandomMode && (
                    <div className="mt-4 text-center text-xs text-text-muted">
                        下次复习：{new Date(lastResult.next_review_at).toLocaleDateString('zh-CN')}
                        {' '}({Math.round(lastResult.new_interval)} 天后)
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-bg-base text-text-primary font-mono">
            {/* Header */}
            <header className="h-14 border-b border-border flex items-center px-4 md:px-8 bg-bg-surface">
                <button
                    onClick={() => navigate('/nav')}
                    className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors mr-3"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold uppercase tracking-wider text-white">
                        复习队列
                    </h1>
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">
                        Spaced Repetition Review
                    </span>
                </div>
                <button
                    onClick={refreshQueue}
                    className="ml-auto p-2 text-text-muted hover:text-accent-primary transition-colors"
                    title="刷新"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
                    </div>
                ) : queue.length === 0 ? (
                    renderEmptyState()
                ) : (
                    renderReviewCard()
                )}
            </main>

            {/* WordInspector for dictionary lookup */}
            {inspectedWord && (
                <WordInspector
                    selectedWord={inspectedWord}
                    inspectorData={inspectorData}
                    isInspecting={isInspecting}
                    onClose={closeInspector}
                    onPlayAudio={playAudio}
                    onMarkAsKnown={() => { }}
                    contextExplanation={wordExplanation}
                    isExplaining={isExplainingWord}
                    isPhrase={isPhrase}
                    onExplainStyle={changeExplainStyle}
                    currentStyle={explainStyle}
                    generatedImage={generatedImage}
                    isGeneratingImage={isGeneratingImage}
                />
            )}
        </div>
    );
};

export default ReviewQueue;
