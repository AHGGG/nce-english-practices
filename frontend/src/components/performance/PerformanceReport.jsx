import React, { useEffect, useState } from 'react';
import { Clock, BookOpen, FileText, Brain } from 'lucide-react';
import api from '../../api/client';
import Card from './cards/Card';
import MemoryCurveChart from './widgets/MemoryCurveChart';
import { formatDuration, formatWordCount } from './utils';

/**
 * Simplified Performance Report Page
 * Shows: Study Time, Reading Stats, Memory Curve
 */
const PerformanceReport = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        setLoading(true);
        api.get(`/api/performance?days=${days}`)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(err => {
                console.error("Performance fetch error:", err);
                setLoading(false);
            });
    }, [days]);

    if (loading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-bg font-mono gap-4">
                <div className="w-12 h-12 border-4 border-ink-faint border-t-neon-cyan rounded-none animate-spin"></div>
                <div className="text-neon-cyan tracking-widest animate-pulse">{'>>'} LOADING METRICS...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 text-center text-neon-pink font-mono bg-bg h-full flex flex-col items-center justify-center">
                <div className="border border-neon-pink p-4">ERROR: FAILED_TO_LOAD_DATA</div>
            </div>
        );
    }

    const { study_time, reading_stats, memory_curve } = data;

    return (
        <section className="h-full w-full bg-bg overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            {/* Header */}
            <header className="mb-8 border-b border-ink-faint pb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-1 h-12 bg-neon-purple"></div>
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-ink mb-1">学习报告</h2>
                        <p className="text-ink-muted text-sm font-mono uppercase tracking-widest">{'>>'} Performance Analytics</p>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div className="flex gap-2 font-mono text-sm">
                    {[7, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1 border transition-colors ${days === d
                                ? 'bg-neon-cyan text-bg border-neon-cyan'
                                : 'border-ink-faint text-ink-muted hover:border-ink'
                                }`}
                        >
                            {d} DAYS
                        </button>
                    ))}
                </div>
            </header>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Study Time Card */}
                <div className="bg-bg-paper border border-ink-faint p-6 shadow-hard relative group hover:border-neon-cyan transition-colors">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-cyan/30"></div>
                    <div className="flex items-start justify-between mb-2">
                        <Clock className="text-neon-cyan opacity-70" size={20} />
                    </div>
                    <div className="text-3xl font-mono font-bold text-neon-cyan mb-1">
                        {formatDuration(study_time?.total_minutes || 0)}
                    </div>
                    <div className="text-sm font-serif text-ink">总学习时长</div>
                    <div className="text-xs font-mono text-ink-muted mt-2 space-y-1">
                        {study_time?.breakdown?.sentence_study > 0 && (
                            <div>句子学习: {formatDuration(Math.round(study_time.breakdown.sentence_study / 60))}</div>
                        )}
                        {study_time?.breakdown?.reading > 0 && (
                            <div>阅读: {formatDuration(Math.round(study_time.breakdown.reading / 60))}</div>
                        )}
                    </div>
                </div>

                {/* Reading Words Card */}
                <div className="bg-bg-paper border border-ink-faint p-6 shadow-hard relative group hover:border-neon-green transition-colors">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-green/30"></div>
                    <div className="flex items-start justify-between mb-2">
                        <BookOpen className="text-neon-green opacity-70" size={20} />
                    </div>
                    <div className="text-3xl font-mono font-bold text-neon-green mb-1">
                        {formatWordCount(reading_stats?.total_words || 0)}
                    </div>
                    <div className="text-sm font-serif text-ink">阅读字数</div>
                    <div className="text-xs font-mono text-ink-muted mt-1">validated words</div>
                </div>

                {/* Articles Count Card */}
                <div className="bg-bg-paper border border-ink-faint p-6 shadow-hard relative group hover:border-neon-purple transition-colors">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-purple/30"></div>
                    <div className="flex items-start justify-between mb-2">
                        <FileText className="text-neon-purple opacity-70" size={20} />
                    </div>
                    <div className="text-3xl font-mono font-bold text-neon-purple mb-1">
                        {reading_stats?.articles_count || 0}
                    </div>
                    <div className="text-sm font-serif text-ink">已读文章</div>
                    <div className="text-xs font-mono text-ink-muted mt-1">{reading_stats?.sessions_count || 0} sessions</div>
                </div>
            </div>

            {/* Memory Curve Section */}
            {memory_curve && memory_curve.total_words_analyzed > 0 && (
                <Card title="记忆曲线" icon={Brain}>
                    <MemoryCurveChart data={memory_curve} />
                </Card>
            )}

            {/* Empty State for Memory Curve */}
            {(!memory_curve || memory_curve.total_words_analyzed === 0) && (
                <Card title="记忆曲线" icon={Brain}>
                    <div className="text-center py-12 text-ink-muted font-mono">
                        <Brain className="mx-auto mb-4 opacity-30" size={48} />
                        <div>暂无足够数据</div>
                        <div className="text-xs mt-2">多学习一些单词后，这里会显示你的记忆曲线</div>
                    </div>
                </Card>
            )}
        </section>
    );
};

export default PerformanceReport;
