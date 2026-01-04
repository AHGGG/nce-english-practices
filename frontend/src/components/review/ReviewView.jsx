/**
 * ReviewView - SM-2 Spaced Repetition Review System
 * 
 * A card-based review interface that implements the SM-2 algorithm.
 * Features:
 * - Flip-card UI showing sentence with highlighted words
 * - 3 rating buttons: Forgot (1), Remembered (3), Easy (5)
 * - Progress tracking and empty state
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChevronLeft,
    RotateCcw,
    CheckCircle,
    Zap,
    Loader2,
    BookOpen,
    RefreshCw,
    Clock
} from 'lucide-react';

// API helpers
const api = {
    async getQueue(userId = 'default_user', limit = 20) {
        const res = await fetch(`/api/review/queue?user_id=${userId}&limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch review queue');
        return res.json();
    },
    async complete(itemId, quality) {
        const res = await fetch('/api/review/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId, quality })
        });
        if (!res.ok) throw new Error('Failed to complete review');
        return res.json();
    },
    async getStats(userId = 'default_user') {
        const res = await fetch(`/api/review/stats?user_id=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
    }
};

// Rating options per design spec
const RATING_OPTIONS = [
    {
        quality: 1,
        label: '忘了',
        icon: RotateCcw,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        hoverBg: 'hover:bg-red-500/20',
        borderColor: 'border-red-500/30'
    },
    {
        quality: 3,
        label: '想起来了',
        icon: CheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        hoverBg: 'hover:bg-green-500/20',
        borderColor: 'border-green-500/30'
    },
    {
        quality: 5,
        label: '太简单',
        icon: Zap,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        hoverBg: 'hover:bg-amber-500/20',
        borderColor: 'border-amber-500/30'
    }
];

// Highlight words in sentence
const HighlightedSentence = ({ text, highlights = [] }) => {
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
                        className="bg-amber-500/30 text-amber-200 px-1 rounded"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                );
            })}
        </>
    );
};

const ReviewView = ({ onBack }) => {
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ total_items: 0, due_items: 0, total_reviews: 0 });
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    // Audio ref
    const audioRef = useRef(null);

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
            const result = await api.complete(currentItem.id, quality);
            setLastResult(result);

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
    }, [currentItem, currentIndex, queue.length, isSubmitting]);

    // Refresh queue
    const refreshQueue = useCallback(async () => {
        setLoading(true);
        try {
            const [queueData, statsData] = await Promise.all([
                api.getQueue(),
                api.getStats()
            ]);
            setQueue(queueData.items || []);
            setStats(statsData);
            setCurrentIndex(0);
        } catch (e) {
            console.error('Failed to refresh:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Render empty state
    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center flex-1 px-4">
            <div className="w-20 h-20 rounded-full bg-[#00FF94]/10 flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-[#00FF94]" />
            </div>
            <h2 className="text-xl font-serif text-white mb-2">暂无待复习内容</h2>
            <p className="text-[#888] text-sm text-center max-w-xs">
                太棒了！你已经完成了所有复习任务。继续学习新内容吧！
            </p>
            <div className="mt-8 space-y-3 text-center">
                <button
                    onClick={refreshQueue}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-[#888] hover:text-[#00FF94] transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    刷新队列
                </button>
            </div>
        </div>
    );

    // Render stats header
    const renderStats = () => (
        <div className="flex items-center gap-4 text-xs text-[#666]">
            <div className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>{stats.total_items} 总项</span>
            </div>
            <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{queue.length} 待复习</span>
            </div>
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
                    <span className="text-xs text-[#666]">
                        {currentIndex + 1} / {queue.length}
                    </span>
                    {renderStats()}
                </div>

                {/* Card */}
                <div className="flex-1 flex flex-col border border-[#333] bg-[#0A0A0A]">
                    {/* Source tag */}
                    <div className="px-4 py-2 border-b border-[#222] flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-[#00FF94]/10 text-[#00FF94] rounded">
                            📖 {bookName.slice(0, 20)}...
                        </span>
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                            🏷️ {currentItem.difficulty_type}
                        </span>
                    </div>

                    {/* Sentence */}
                    <div
                        className="flex-1 flex items-center justify-center p-6 md:p-10 cursor-pointer"
                        onClick={() => playAudio(currentItem.sentence_text)}
                    >
                        <p className="font-serif text-xl md:text-2xl text-white leading-relaxed text-center">
                            <HighlightedSentence
                                text={currentItem.sentence_text}
                                highlights={currentItem.highlighted_items || []}
                            />
                        </p>
                    </div>

                    {/* Interval info */}
                    <div className="px-4 py-2 border-t border-[#222] text-xs text-[#666] text-center">
                        {currentItem.repetition > 0 ? (
                            <span>
                                已复习 {currentItem.repetition} 次 · 上次间隔 {Math.round(currentItem.interval_days)} 天
                            </span>
                        ) : (
                            <span>首次复习</span>
                        )}
                    </div>
                </div>

                {/* Rating buttons */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                    {RATING_OPTIONS.map(option => {
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.quality}
                                onClick={() => handleRating(option.quality)}
                                disabled={isSubmitting}
                                className={`
                                    flex flex-col items-center gap-2 p-4 min-h-[80px]
                                    border ${option.borderColor} ${option.bgColor} ${option.hoverBg}
                                    transition-all disabled:opacity-50
                                    active:scale-95
                                `}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-[#666]" />
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

                {/* Last result feedback */}
                {lastResult && (
                    <div className="mt-4 text-center text-xs text-[#666]">
                        下次复习：{new Date(lastResult.next_review_at).toLocaleDateString('zh-CN')}
                        {' '}({Math.round(lastResult.new_interval)} 天后)
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen flex flex-col bg-[#050505] text-[#E0E0E0] font-mono">
            {/* Header */}
            <header className="h-14 border-b border-[#333] flex items-center px-4 md:px-8 bg-[#0A0A0A]">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#888] hover:text-[#00FF94] transition-colors mr-3"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold uppercase tracking-wider text-white">
                        复习队列
                    </h1>
                    <span className="text-[10px] text-[#666] uppercase tracking-wider">
                        Spaced Repetition Review
                    </span>
                </div>
                <button
                    onClick={refreshQueue}
                    className="ml-auto p-2 text-[#666] hover:text-[#00FF94] transition-colors"
                    title="刷新"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </header>

            {/* Main content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#00FF94]" />
                    </div>
                ) : queue.length === 0 ? (
                    renderEmptyState()
                ) : (
                    renderReviewCard()
                )}
            </main>
        </div>
    );
};

export default ReviewView;
