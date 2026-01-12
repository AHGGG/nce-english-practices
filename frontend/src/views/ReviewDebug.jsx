import React, { useState, useEffect } from 'react';
import { Calendar, RotateCw, Calculator, HelpCircle, ArrowRight } from 'lucide-react';
import { Card, Tag } from '../components/ui';

const ReviewDebug = () => {
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(14);

    useEffect(() => {
        fetchSchedule();
    }, [days]);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/review/debug/schedule?days=${days}`);
            if (res.ok) {
                const data = await res.json();
                setSchedule(data.schedule || {});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const dates = Object.keys(schedule).sort();

    return (
        <div className="min-h-screen bg-bg-canvas p-6 pb-20">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-ink mb-2">Review Algorithm Debug</h1>
                        <p className="text-ink-muted font-mono text-sm">
                            Inspect SM-2 scheduling logic and future review queue.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="bg-bg-elevated border border-ink-faint text-ink px-3 py-1.5 font-mono text-sm"
                        >
                            <option value={7}>Next 7 Days</option>
                            <option value={14}>Next 14 Days</option>
                            <option value={30}>Next 30 Days</option>
                        </select>
                        <button
                            onClick={fetchSchedule}
                            className="p-2 border border-ink-faint text-ink hover:text-neon-green hover:border-neon-green transition-colors"
                        >
                            <RotateCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-ink-muted font-mono animate-pulse">
                        LOADING DATA...
                    </div>
                ) : (
                    <div className="space-y-8">
                        {dates.length === 0 && (
                            <div className="p-10 text-center border border-dashed border-ink-faint text-ink-muted font-mono">
                                No reviews scheduled for the next {days} days.
                            </div>
                        )}

                        {dates.map(date => (
                            <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-4 sticky top-0 bg-bg-canvas/90 backdrop-blur py-2 z-10 border-b border-ink-faint">
                                    <Calendar className="w-5 h-5 text-neon-cyan" />
                                    <h2 className="text-lg font-bold font-mono text-ink tracking-wider">
                                        {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </h2>
                                    <span className="text-xs font-mono text-ink-muted bg-bg-elevated px-2 py-0.5 rounded">
                                        {schedule[date].length} items
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {schedule[date].map(item => (
                                        <ReviewItemRow key={item.id} item={item} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const ReviewItemRow = ({ item }) => {
    return (
        <div className="group bg-bg-paper border border-ink-faint p-4 hover:border-neon-green/50 transition-all flex items-start gap-4">
            {/* Main Content */}
            <div className="flex-grow min-w-0">
                <div className="text-ink font-serif text-lg mb-2 truncate">
                    {item.text}
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-2 items-center">
                    <MetricBadge label="Interval" value={`${item.interval.toFixed(1)}d`} color="cyan" />
                    <MetricBadge label="Factor" value={item.ef.toFixed(2)} color="pink" />
                    <MetricBadge label="Repetition" value={item.repetition} color="amber" />
                    <div className="text-xs text-ink-muted font-mono ml-2">
                        Due: {new Date(item.next_review_at).toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* Debug/Logic Section (Right Side) */}
            <div className="flex-shrink-0 relative">
                <LogicTooltip item={item} />
            </div>
        </div>
    );
};

const MetricBadge = ({ label, value, color }) => {
    const colors = {
        cyan: "text-neon-cyan border-neon-cyan/30 bg-neon-cyan/5",
        pink: "text-neon-pink border-neon-pink/30 bg-neon-pink/5",
        amber: "text-neon-amber border-neon-amber/30 bg-neon-amber/5"
    };

    return (
        <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-mono border ${colors[color]}`}>
            <span className="opacity-60 uppercase">{label}:</span>
            <span className="font-bold">{value}</span>
        </div>
    );
};

const LogicTooltip = ({ item }) => {
    if (!item.last_review) {
        return (
            <div className="text-xs font-mono text-ink-muted flex items-center gap-1 opacity-50 cursor-not-allowed">
                <Calculator className="w-4 h-4" />
                <span>New Item</span>
            </div>
        );
    }

    const { date, quality, duration_ms, interval_before } = item.last_review;

    // Logic Calculation Preview
    let logicText = "";
    if (quality < 3) {
        logicText = "Reset: Quality < 3 resets Rep to 0 and Interval to 1.";
    } else if (item.repetition === 1) {
        logicText = "First Pass: Quality ≥ 3 sets Interval to 1.0.";
    } else if (item.repetition === 2) {
        logicText = "Second Pass: Quality ≥ 3 sets Interval to 6.0.";
    } else {
        // SM-2: I_new = I_old * EF_new
        const predicted_interval = interval_before * item.ef;
        logicText = `Growth: I_new = I_prev (${interval_before}) * EF (${item.ef}) ≈ ${predicted_interval.toFixed(2)}`;
    }

    return (
        <div className="group/tooltip relative">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated border border-ink-faint text-ink-muted hover:text-neon-green hover:border-neon-green transition-all font-mono text-xs uppercase tracking-wider">
                <Calculator className="w-4 h-4" />
                <span>Inspect Logic</span>
            </button>

            {/* Tooltip Content */}
            <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-bg-elevated border border-ink border-b-4 border-b-neon-green shadow-hard z-50 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all translate-y-2 group-hover/tooltip:translate-y-0 text-left pointer-events-none">
                <div className="font-mono text-xs font-bold text-neon-green mb-3 uppercase tracking-wider border-b border-ink-faint pb-1">
                    Scheduling Logic Trace
                </div>

                <div className="space-y-3 font-mono text-xs text-ink-muted">
                    <div className="flex justify-between">
                        <span>Last Review:</span>
                        <span className="text-ink">{new Date(date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>User Rating:</span>
                        <span className={`font-bold ${quality >= 3 ? 'text-neon-cyan' : 'text-neon-pink'}`}>
                            {quality} ({quality === 5 ? 'Easy' : quality === 3 ? 'Remembered' : 'Forgot'})
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Prev Interval:</span>
                        <span className="text-ink">{interval_before} days</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Study Duration:</span>
                        <span className="text-ink">{(duration_ms / 1000).toFixed(1)}s</span>
                    </div>

                    <div className="h-px bg-ink-faint my-2" />

                    <div>
                        <span className="block text-ink mb-1 font-bold">Calculation:</span>
                        <p className="leading-relaxed text-ink/80 opacity-80">
                            {logicText}
                        </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-ink-faint flex items-center justify-between text-neon-green font-bold">
                        <span>Result:</span>
                        <span className="flex items-center gap-1">
                            Next Review in {item.interval.toFixed(1)}d
                            <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewDebug;
