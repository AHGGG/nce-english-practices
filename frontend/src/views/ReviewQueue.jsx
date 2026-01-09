/**
 * ReviewQueue View - SM-2 Spaced Repetition Review System
 * 
 * A card-based review interface that implements the SM-2 algorithm.
 * Features:
 * - Flip-card UI showing sentence with highlighted words
 * - 3 rating buttons: Forgot (1), Remembered (3), Easy (5)
 * - Progress tracking and empty state
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
    Lightbulb,
    ArrowRight,
    SkipForward
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getGapTypeInfo } from '../components/sentence-study/constants';

// API helpers for SM-2 review system
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



// Rating options per design spec (SM-2 quality scores)
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

const ReviewQueue = () => {
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ total_items: 0, due_items: 0, total_reviews: 0 });
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    // Help panel state
    const [showHelpPanel, setShowHelpPanel] = useState(false);
    const [helpStage, setHelpStage] = useState(1);
    const [helpContent, setHelpContent] = useState('');
    const [isLoadingHelp, setIsLoadingHelp] = useState(false);
    const helpRequestIdRef = useRef(0);

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

            // Reset help panel state
            setShowHelpPanel(false);
            setHelpStage(1);
            setHelpContent('');

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
                            🏷️ {getGapTypeInfo(currentItem.difficulty_type).shortLabel}
                        </span>
                    </div>

                    {/* Sentence */}
                    <div
                        className="flex-1 flex items-center justify-center p-6 md:p-10 cursor-pointer"
                        onClick={() => playAudio(currentItem.sentence_text)}
                    >
                        <p className="font-serif text-xl md:text-2xl text-white leading-relaxed text-left w-full">
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

                {/* Help Panel (shown when user clicks 'Forgot') */}
                {showHelpPanel ? (
                    <div className="mt-6 border border-[#333] bg-[#0A0A0A]">
                        {/* Stage indicator */}
                        <div className="px-4 py-2 border-b border-[#222] flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-amber-400 font-mono">
                                STAGE {helpStage} / 3
                            </span>
                            <div className="flex-1 h-1 bg-[#222] rounded-full ml-2">
                                <div
                                    className="h-full bg-amber-400 rounded-full transition-all"
                                    style={{ width: `${(helpStage / 3) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Explanation content */}
                        <div className="p-4 min-h-[120px] max-h-[200px] overflow-y-auto">
                            {isLoadingHelp && !helpContent ? (
                                <div className="flex items-center gap-2 text-[#666]">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">正在生成解释...</span>
                                </div>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none text-[#CCC]">
                                    <ReactMarkdown>{helpContent}</ReactMarkdown>
                                </div>
                            )}
                        </div>

                        {/* Response buttons */}
                        <div className="px-4 py-3 border-t border-[#222] space-y-2">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleHelpResponse(true)}
                                    disabled={isSubmitting || isLoadingHelp}
                                    className="flex items-center justify-center gap-2 p-3 
                                        border border-green-500/30 bg-green-500/10 hover:bg-green-500/20
                                        text-green-400 transition-all disabled:opacity-50"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm">想起来了</span>
                                </button>
                                <button
                                    onClick={() => handleHelpResponse(false)}
                                    disabled={isSubmitting || isLoadingHelp}
                                    className="flex items-center justify-center gap-2 p-3 
                                        border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20
                                        text-amber-400 transition-all disabled:opacity-50"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                    <span className="text-sm">
                                        {helpStage < 3 ? '还是不懂' : '继续'}
                                    </span>
                                </button>
                            </div>
                            <button
                                onClick={handleSkipHelp}
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 p-2
                                    text-[#666] hover:text-[#888] transition-colors text-xs"
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
                )}

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
                    onClick={() => navigate('/nav')}
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
            <main className="flex-1 flex flex-col overflow-y-auto">
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

export default ReviewQueue;
