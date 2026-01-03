import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';

const ReviewQueue = () => {
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/sentence-study/queue');
            if (!response.ok) throw new Error('Failed to fetch queue');
            const data = await response.json();
            setQueue(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const handleReview = async (recordId, result) => {
        try {
            const response = await fetch('/api/sentence-study/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record_id: recordId, result })
            });
            if (response.ok) {
                // Remove from queue
                setQueue(queue.filter(item => item.record_id !== recordId));
            }
        } catch (err) {
            console.error('Review failed:', err);
        }
    };

    const getGapColor = (gapType) => {
        if (!gapType) return 'text-ink-muted';
        if (gapType.includes('vocab')) return 'text-neon-lime';
        if (gapType.includes('structure') || gapType.includes('grammar')) return 'text-neon-magenta';
        if (gapType.includes('collocation')) return 'text-neon-cyan';
        return 'text-ink-muted';
    };

    return (
        <div className="min-h-screen bg-bg p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/nav')}
                        className="p-2 hover:bg-surface-1 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-ink" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold font-serif text-ink">Review Queue</h1>
                        <p className="text-ink-muted font-mono">// SPACED_REPETITION_SYSTEM</p>
                    </div>
                    <button
                        onClick={fetchQueue}
                        className="ml-auto p-2 hover:bg-surface-1 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 text-ink ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="text-center py-12 text-ink-muted">Loading...</div>
                ) : error ? (
                    <div className="text-center py-12 text-red-500">{error}</div>
                ) : queue.length === 0 ? (
                    <div className="text-center py-12">
                        <CheckCircle className="w-16 h-16 text-neon-lime mx-auto mb-4" />
                        <h2 className="text-2xl font-serif text-ink mb-2">All Caught Up!</h2>
                        <p className="text-ink-muted">No sentences due for review. Keep studying!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {queue.map((item) => (
                            <div
                                key={item.record_id}
                                className="bg-surface-1 border border-ink-faint p-6"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-ink-muted" />
                                        <span className="text-xs font-mono text-ink-muted">
                                            {item.source_id.split(':').slice(-2)[0]}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-mono px-2 py-1 bg-surface-2 ${getGapColor(item.diagnosed_gap_type)}`}>
                                        {item.diagnosed_gap_type || 'unknown'}
                                    </span>
                                </div>

                                {/* Sentence Text */}
                                <p className="text-ink text-lg leading-relaxed mb-4 font-serif">
                                    {item.sentence_text || `[Sentence #${item.sentence_index + 1}]`}
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleReview(item.record_id, 'clear')}
                                        className="flex-1 py-2 bg-neon-lime/10 border border-neon-lime text-neon-lime hover:bg-neon-lime hover:text-bg transition-colors"
                                    >
                                        Got It ✓
                                    </button>
                                    <button
                                        onClick={() => handleReview(item.record_id, 'unclear')}
                                        className="flex-1 py-2 bg-neon-magenta/10 border border-neon-magenta text-neon-magenta hover:bg-neon-magenta hover:text-bg transition-colors"
                                    >
                                        Still Unclear
                                    </button>
                                    <button
                                        onClick={() => navigate(`/sentence-study?source=${encodeURIComponent(item.source_id)}&index=${item.sentence_index}`)}
                                        className="px-4 py-2 bg-surface-2 border border-ink-faint text-ink hover:border-neon-cyan transition-colors"
                                    >
                                        Study →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewQueue;
