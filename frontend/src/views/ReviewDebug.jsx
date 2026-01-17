import React, { useState, useEffect } from 'react';
import { Calendar, RotateCw, Calculator, HelpCircle, ArrowRight } from 'lucide-react';
import { Card, Tag } from '../components/ui';

const ReviewDebug = () => {
    const [schedule, setSchedule] = useState({});
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(14);

    useEffect(() => {
        fetchSchedule();
    }, [days, fetchSchedule]);

    const fetchSchedule = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/review/debug/schedule?days=${days}`);
            if (res.ok) {
                const json = await res.json();
                setSchedule(json.schedule || {});
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [days]);

    const dates = Object.keys(schedule).sort();

    return (
        <div className="min-h-screen bg-bg-base p-6 pb-20">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-text-primary mb-2">Review Algorithm Debug</h1>
                        <p className="text-text-muted font-mono text-sm">
                            Inspect SM-2 scheduling logic and future review queue.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="bg-bg-elevated border border-border text-text-primary px-3 py-1.5 font-mono text-sm"
                        >
                            <option value={7}>Next 7 Days</option>
                            <option value={14}>Next 14 Days</option>
                            <option value={30}>Next 30 Days</option>
                        </select>
                        <button
                            onClick={fetchSchedule}
                            className="p-2 border border-border text-text-primary hover:text-accent-primary hover:border-accent-primary transition-colors"
                        >
                            <RotateCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 text-text-muted font-mono animate-pulse">
                        LOADING DATA...
                    </div>
                ) : (
                    <div className="space-y-8">
                        {dates.length === 0 && (
                            <div className="p-10 text-center border border-dashed border-border text-text-muted font-mono">
                                No reviews scheduled for the next {days} days.
                            </div>
                        )}

                        {dates.map(date => (
                            <div key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-4 sticky top-0 bg-bg-base/90 backdrop-blur py-2 z-10 border-b border-border">
                                    <Calendar className="w-5 h-5 text-accent-info" />
                                    <h2 className="text-lg font-bold font-mono text-text-primary tracking-wider">
                                        {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </h2>
                                    <span className="text-xs font-mono text-text-muted bg-bg-elevated px-2 py-0.5 rounded">
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
        <div className="group bg-bg-surface border border-border p-4 hover:border-accent-primary/50 transition-all flex items-start gap-4">
            {/* Main Content */}
            <div className="flex-grow min-w-0">
                <div className="text-text-primary font-serif text-lg mb-2 truncate">
                    {item.text}
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-2 items-center">
                    <MetricBadge label="Interval" value={`${item.interval.toFixed(1)}d`} color="cyan" />
                    <MetricBadge label="Factor" value={item.ef.toFixed(2)} color="pink" />
                    <MetricBadge label="Repetition" value={item.repetition} color="amber" />
                    <div className="text-xs text-text-muted font-mono ml-2">
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
        cyan: "text-accent-info border-accent-info/30 bg-accent-info/5",
        pink: "text-accent-danger border-accent-danger/30 bg-accent-danger/5",
        amber: "text-accent-warning border-accent-warning/30 bg-accent-warning/5"
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
            <div className="text-xs font-mono text-text-muted flex items-center gap-1 opacity-50 cursor-not-allowed">
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
            <button className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated border border-border text-text-muted hover:text-accent-primary hover:border-accent-primary transition-all font-mono text-xs uppercase tracking-wider">
                <Calculator className="w-4 h-4" />
                <span>Inspect Logic</span>
            </button>

            {/* Tooltip Content */}
            <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-bg-elevated border border-border border-b-4 border-b-accent-primary shadow-hard z-50 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all translate-y-2 group-hover/tooltip:translate-y-0 text-left pointer-events-none">
                <div className="font-mono text-xs font-bold text-accent-primary mb-3 uppercase tracking-wider border-b border-border pb-1">
                    Scheduling Logic Trace
                </div>

                <div className="space-y-3 font-mono text-xs text-text-muted">
                    <div className="flex justify-between">
                        <span>Last Review:</span>
                        <span className="text-text-primary">{new Date(date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>User Rating:</span>
                        <span className={`font-bold ${quality >= 3 ? 'text-accent-info' : 'text-accent-danger'}`}>
                            {quality} ({quality === 5 ? 'Easy' : quality === 3 ? 'Remembered' : 'Forgot'})
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Prev Interval:</span>
                        <span className="text-text-primary">{interval_before} days</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Study Duration:</span>
                        <span className="text-text-primary">{(duration_ms / 1000).toFixed(1)}s</span>
                    </div>

                    <div className="h-px bg-border my-2" />

                    <div>
                        <span className="block text-text-primary mb-1 font-bold">Calculation:</span>
                        <p className="leading-relaxed text-text-primary/80 opacity-80">
                            {logicText}
                        </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-accent-primary font-bold">
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
