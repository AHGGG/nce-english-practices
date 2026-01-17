import React, { useState, useEffect } from 'react';
import { Activity, RotateCw, BarChart2, List, Info, ChevronDown, ChevronRight, CheckCircle, XCircle, BookOpen, HelpCircle } from 'lucide-react';
import { Card, Tag } from '../components/ui';

const MemoryCurveDebug = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedLogs, setExpandedLogs] = useState(false);
    const [showHelp, setShowHelp] = useState(true);

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
                            记忆曲线诊断工具 - 分析复习数据分布情况
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className={`p-2 border transition-colors ${showHelp ? 'border-accent-primary text-accent-primary' : 'border-border text-text-muted hover:text-accent-primary hover:border-accent-primary'}`}
                            title="显示/隐藏帮助"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                        <button
                            onClick={fetchData}
                            className="p-2 border border-border text-text-primary hover:text-accent-primary hover:border-accent-primary transition-colors"
                            title="刷新数据"
                        >
                            <RotateCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Help Section - 背景知识 */}
                {showHelp && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        {/* 什么是记忆曲线 */}
                        <div className="p-4 border border-neon-purple/30 bg-neon-purple/5">
                            <div className="flex items-start gap-3">
                                <BookOpen className="w-5 h-5 text-neon-purple mt-0.5 flex-shrink-0" />
                                <div className="space-y-2">
                                    <h3 className="font-bold text-text-primary">什么是记忆曲线？</h3>
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        <strong>记忆曲线（Memory Curve）</strong>展示了你在不同复习间隔下的记忆保持率。
                                        理论上，随着复习间隔增加（从1天到30天），记忆保持率会逐渐下降（艾宾浩斯遗忘曲线）。
                                        但如果你持续复习成功，实际保持率可能高于理论值。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SM-2 算法说明 */}
                        <div className="p-4 border border-accent-info/30 bg-accent-info/5">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-accent-info mt-0.5 flex-shrink-0" />
                                <div className="space-y-2">
                                    <h3 className="font-bold text-text-primary">SM-2 间隔重复算法</h3>
                                    <p className="text-sm text-text-secondary leading-relaxed">
                                        本系统使用 <strong>SM-2 算法</strong> 安排复习。每次复习后，系统根据你的反馈调整下次复习的间隔：
                                    </p>
                                    <ul className="text-sm text-text-secondary space-y-1 ml-4 list-disc">
                                        <li><strong>第1次复习</strong>：间隔 = 1 天</li>
                                        <li><strong>第2次复习</strong>：间隔 = 6 天</li>
                                        <li><strong>第3次及以后</strong>：间隔 = 上次间隔 × EF（难度系数，通常2.5左右）</li>
                                    </ul>
                                    <p className="text-sm text-text-muted mt-2">
                                        💡 因此，如果你刚开始使用系统，所有复习都处于"1天间隔"阶段，记忆曲线只会显示 Day 1 的数据。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Alert */}
                <div className="p-4 border border-accent-warning/30 bg-accent-warning/5">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-accent-warning mt-0.5" />
                        <div className="font-mono text-sm text-text-primary/80">
                            {data.summary.explanation}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Logs"
                        value={data.total_logs}
                        icon={List}
                        color="cyan"
                        tooltip="总复习次数：你完成的所有复习记录数量"
                    />
                    <StatCard
                        label="Avg Quality"
                        value={data.summary.avg_quality || 'N/A'}
                        icon={Activity}
                        color="pink"
                        tooltip="平均质量分：1=忘了, 3=想起来了, 5=太简单。≥3 表示成功记住"
                    />
                    <StatCard
                        label="Buckets with Data"
                        value={`${data.summary.buckets_with_data}/${data.summary.total_buckets}`}
                        icon={BarChart2}
                        color="amber"
                        tooltip="有数据的桶数/总桶数（5个桶：Day1, Day3, Day7, Day14, Day30）"
                    />
                    <StatCard
                        label="Status"
                        value={data.summary.buckets_with_data === 1 ? "仅 Day 1" : data.summary.buckets_with_data < 3 ? "初期阶段" : "数据充足"}
                        icon={data.summary.buckets_with_data === 1 ? XCircle : CheckCircle}
                        color={data.summary.buckets_with_data === 1 ? "red" : data.summary.buckets_with_data < 3 ? "amber" : "green"}
                        tooltip={data.summary.buckets_with_data === 1
                            ? "所有复习都在短间隔阶段，需要更多时间积累长间隔数据"
                            : "已有多个间隔阶段的复习数据"}
                    />
                </div>

                {/* Interval Distribution */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-3 mb-2 border-b border-border pb-2">
                        <BarChart2 className="w-5 h-5 text-accent-info" />
                        <h2 className="text-lg font-bold font-mono text-text-primary tracking-wider">
                            Interval Distribution
                        </h2>
                    </div>
                    <p className="text-sm text-text-muted mb-4">
                        📊 <strong>间隔分布</strong>：显示每个间隔范围内有多少条复习记录。
                        理想情况下，数据应该平均分布在各个范围。如果集中在 "0-2 days"，说明你刚开始使用复习系统。
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {Object.entries(data.interval_distribution).map(([range, count]) => (
                            <div key={range} className="bg-bg-surface border border-border p-3 text-center relative group">
                                <div className="text-2xl font-bold text-accent-info font-mono">{count}</div>
                                <div className="text-xs text-text-muted font-mono mt-1">{range}</div>
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-bg-elevated border border-border px-2 py-1 text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    间隔 {range} 有 {count} 条记录
                                </div>
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
                    <div className="flex items-center gap-3 mb-2 border-b border-border pb-2">
                        <Activity className="w-5 h-5 text-accent-warning" />
                        <h2 className="text-lg font-bold font-mono text-text-primary tracking-wider">
                            Bucket Statistics
                        </h2>
                    </div>
                    <p className="text-sm text-text-muted mb-4">
                        📈 <strong>记忆曲线数据源</strong>：这些数据直接用于生成记忆曲线图表。
                        每个"桶"代表一个间隔阶段，<strong>保持率 = 成功数 ÷ 样本数</strong>。
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-bg-elevated text-left">
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">
                                        Day Label
                                        <span className="block text-text-muted/50 font-normal normal-case">曲线X轴标签</span>
                                    </th>
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">
                                        Interval Range
                                        <span className="block text-text-muted/50 font-normal normal-case">对应的间隔范围</span>
                                    </th>
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">
                                        Sample Size
                                        <span className="block text-text-muted/50 font-normal normal-case">该范围内的复习次数</span>
                                    </th>
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">
                                        Success
                                        <span className="block text-text-muted/50 font-normal normal-case">记住的次数 (Q≥3)</span>
                                    </th>
                                    <th className="px-4 py-2 text-xs font-mono text-text-muted uppercase">
                                        Retention Rate
                                        <span className="block text-text-muted/50 font-normal normal-case">保持率（成功/总数）</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.buckets.map((bucket) => (
                                    <tr key={bucket.day} className="border-b border-border hover:bg-bg-surface/50 transition-colors">
                                        <td className="px-4 py-3 font-mono text-text-primary">
                                            Day {bucket.day}
                                            {bucket.day === 1 && <span className="ml-2 text-xs text-accent-info">首次复习</span>}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-text-muted">
                                            {bucket.interval_range} days
                                        </td>
                                        <td className="px-4 py-3 font-mono">
                                            <span className={bucket.sample_size > 0 ? 'text-accent-info' : 'text-text-muted'}>
                                                {bucket.sample_size}
                                            </span>
                                            {bucket.sample_size === 0 && (
                                                <span className="ml-2 text-xs text-text-muted">暂无数据</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-accent-success">
                                            {bucket.success_count}
                                        </td>
                                        <td className="px-4 py-3 font-mono">
                                            {bucket.retention_rate !== null ? (
                                                <span className={bucket.retention_rate >= 0.7 ? 'text-accent-success' : bucket.retention_rate >= 0.5 ? 'text-accent-warning' : 'text-accent-danger'}>
                                                    {(bucket.retention_rate * 100).toFixed(0)}%
                                                    {bucket.retention_rate >= 0.8 && <span className="ml-1">✓</span>}
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

                    {/* 表格说明 */}
                    <div className="mt-4 p-3 bg-bg-surface border border-border text-sm text-text-muted">
                        <strong>💡 如何解读：</strong>
                        <ul className="mt-2 space-y-1 ml-4 list-disc">
                            <li>如果只有 Day 1 有数据，说明你的复习记录还处于"初始间隔"阶段</li>
                            <li>Day 3 数据需要在你成功复习后约 6 天才会出现</li>
                            <li>Day 7/14/30 数据需要更长时间积累（2-4周的持续使用）</li>
                            <li>保持率 ≥70% 表示记忆效果良好，低于 50% 可能需要更频繁复习</li>
                        </ul>
                    </div>
                </div>

                {/* Recent Logs */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <button
                        onClick={() => setExpandedLogs(!expandedLogs)}
                        className="flex items-center gap-3 mb-2 border-b border-border pb-2 w-full text-left hover:text-accent-primary transition-colors"
                    >
                        {expandedLogs ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        <List className="w-5 h-5 text-accent-primary" />
                        <h2 className="text-lg font-bold font-mono text-text-primary tracking-wider">
                            Recent Review Logs ({data.recent_logs.length})
                        </h2>
                    </button>
                    <p className="text-sm text-text-muted mb-4">
                        📝 <strong>原始复习记录</strong>：最近的复习详情，包括质量分(Q)和复习时的间隔(I)。
                    </p>

                    {expandedLogs && (
                        <div className="space-y-2">
                            {/* 图例说明 */}
                            <div className="flex flex-wrap gap-4 p-3 bg-bg-surface border border-border text-xs text-text-muted mb-3">
                                <span><strong>Q</strong> = Quality（质量分）：1=忘了, 2=想起来了（有帮助）, 3=想起来了, 5=太简单</span>
                                <span><strong>I</strong> = Interval（间隔）：复习时的间隔天数</span>
                                <span className="text-accent-success">绿色 Q≥3 = 成功记住</span>
                                <span className="text-accent-danger">红色 Q&lt;3 = 需要重新学习</span>
                            </div>

                            <div className="max-h-96 overflow-y-auto space-y-2">
                                {data.recent_logs.map((log) => (
                                    <div key={log.id} className="bg-bg-surface border border-border p-3 flex items-center gap-4 text-sm font-mono">
                                        <div className="flex-shrink-0 w-20">
                                            <span className={`px-2 py-0.5 text-xs ${log.quality >= 3 ? 'bg-accent-success/10 text-accent-success' : 'bg-accent-danger/10 text-accent-danger'}`}>
                                                Q={log.quality}
                                            </span>
                                        </div>
                                        <div className="flex-shrink-0 w-24 text-accent-info" title={`复习时间隔 ${log.interval_at_review} 天`}>
                                            I={log.interval_at_review}d
                                        </div>
                                        <div className="flex-grow text-text-muted truncate" title={log.sentence_preview}>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color, tooltip }) => {
    const colors = {
        cyan: "text-accent-info border-accent-info/30",
        pink: "text-accent-danger border-accent-danger/30",
        amber: "text-accent-warning border-accent-warning/30",
        green: "text-accent-success border-accent-success/30",
        red: "text-accent-danger border-accent-danger/30"
    };

    return (
        <div className={`bg-bg-surface border p-4 ${colors[color]} relative group`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 opacity-60" />
                <span className="text-xs font-mono text-text-muted uppercase">{label}</span>
            </div>
            <div className="text-2xl font-bold font-mono">{value}</div>
            {tooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-bg-elevated border border-border px-3 py-2 text-xs text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 max-w-xs text-center">
                    {tooltip}
                </div>
            )}
        </div>
    );
};

export default MemoryCurveDebug;
