import React, { useState, useEffect } from 'react';
import { Activity, RotateCw, BarChart2, List, Info, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Card, Tag } from '../components/ui';

const MemoryCurveDebug = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedLogs, setExpandedLogs] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/review/debug/memory-curve');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-base flex items-center justify-center">
                <div className="text-text-muted font-mono animate-pulse">LOADING DEBUG DATA...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-bg-base flex items-center justify-center">
                <div className="text-text-muted font-mono">Failed to load debug data.</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-base p-6 pb-20">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-serif font-bold text-text-primary mb-2">Memory Curve Debug</h1>
                        <p className="text-text-muted font-mono text-sm">
                            Analyze ReviewLog data and bucket distribution for memory curve.
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 border border-border text-text-primary hover:text-accent-primary hover:border-accent-primary transition-colors"
                    >
                        <RotateCw className="w-5 h-5" />
                    </button>
                </div>

                {/* Summary Alert */}
                <div className="p-4 border border-accent-info/30 bg-accent-info/5">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-accent-info mt-0.5" />
                        <div className="font-mono text-sm text-text-primary/80">
                            {data.summary.explanation}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Logs" value={data.total_logs} icon={List} color="cyan" />
                    <StatCard label="Avg Quality" value={data.summary.avg_quality || 'N/A'} icon={Activity} color="pink" />
                    <StatCard label="Buckets with Data" value={`${data.summary.buckets_with_data}/${data.summary.total_buckets}`} icon={BarChart2} color="amber" />
                    <StatCard
                        label="Status"
                        value={data.summary.buckets_with_data === 1 ? "Only Day 1" : "Multi-Day"}
                        icon={data.summary.buckets_with_data === 1 ? XCircle : CheckCircle}
                        color={data.summary.buckets_with_data === 1 ? "red" : "green"}
                    />
                </div>

                {/* Interval Distribution */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
                        <BarChart2 className="w-5 h-5 text-accent-info" />
                        <h2 className="text-lg font-bold font-mono text-text-primary tracking-wider">
                            Interval Distribution
                        </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Object.entries(data.interval_distribution).map(([range, count]) => (
                            <div key={range} className="bg-bg-surface border border-border p-3 text-center">
                                <div className="text-2xl font-bold text-accent-info font-mono">{count}</div>
                                <div className="text-xs text-text-muted font-mono mt-1">{range}</div>
                            </div>
                        ))}
                        {Object.keys(data.interval_distribution).length === 0 && (
                            <div className="col-span-full text-center text-text-muted font-mono py-4">
                                No interval data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Bucket Statistics Table */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                    <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
                        <Activity className="w-5 h-5 text-accent-warning" />
                        <h2 className="text-lg font-bold font-mono text-text-primary tracking-wider">
                            Bucket Statistics (Memory Curve Source)
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-bg-elevated text-left">
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">Day Label</th>
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">Interval Range</th>
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">Sample Size</th>
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">Success</th>
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">Retention Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.buckets.map((bucket) => (
                                    <tr key={bucket.day} className="border-b border-border hover:bg-bg-surface/50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-text-primary">
                                            Day {bucket.day}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-text-muted">
                                            {bucket.interval_range} days
                                        </td>
                                        <td className="px-4 py-3 font-mono">
                                            <span className={bucket.sample_size > 0 ? 'text-accent-info' : 'text-text-muted'}>
                                                {bucket.sample_size}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-accent-success">
                                            {bucket.success_count}
                                        </td>
                                        <td className="px-4 py-3 font-mono">
                                            {bucket.retention_rate !== null ? (
                                                <span className={bucket.retention_rate >= 0.7 ? 'text-accent-success' : bucket.retention_rate >= 0.5 ? 'text-accent-warning' : 'text-accent-danger'}>
                                                    {(bucket.retention_rate * 100).toFixed(0)}%
                                                </span>
                                            ) : (
                                                <span className="text-text-muted">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Logs */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <button
                        onClick={() => setExpandedLogs(!expandedLogs)}
                        className="flex items-center gap-3 mb-4 border-b border-border pb-2 w-full text-left hover:text-accent-primary transition-colors"
                    >
                        {expandedLogs ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        <List className="w-5 h-5 text-accent-primary" />
                        <h2 className="text-lg font-bold font-mono text-text-primary tracking-wider">
                            Recent Review Logs ({data.recent_logs.length})
                        </h2>
                    </button>

                    {expandedLogs && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {data.recent_logs.map((log) => (
                                <div key={log.id} className="bg-bg-surface border border-border p-3 flex items-center gap-4 text-sm font-mono">
                                    <div className="flex-shrink-0 w-20">
                                        <span className={`px-2 py-0.5 text-xs ${log.quality >= 3 ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-danger/10 text-accent-danger'}`}>
                                            Q={log.quality}
                                        </span>
                                    </div>
                                    <div className="flex-shrink-0 w-24 text-accent-info">
                                        I={log.interval_at_review}d
                                    </div>
                                    <div className="flex-grow text-text-muted truncate">
                                        {log.sentence_preview || '—'}
                                    </div>
                                    <div className="flex-shrink-0 text-text-muted text-xs">
                                        {new Date(log.reviewed_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                            {data.recent_logs.length === 0 && (
                                <div className="text-center text-text-muted font-mono py-8">
                                    No review logs found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color }) => {
    const colors = {
        cyan: "text-accent-info border-accent-info/30",
        pink: "text-accent-danger border-accent-danger/30",
        amber: "text-accent-warning border-accent-warning/30",
        green: "text-accent-success border-accent-success/30",
        red: "text-accent-danger border-accent-danger/30"
    };

    return (
        <div className={`bg-bg-surface border p-4 ${colors[color]}`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 opacity-60" />
                <span className="text-xs font-mono text-text-muted uppercase">{label}</span>
            </div>
            <div className="text-2xl font-bold font-mono">{value}</div>
        </div>
    );
};

export default MemoryCurveDebug;
