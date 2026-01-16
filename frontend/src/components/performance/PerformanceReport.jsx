import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, FileText, Brain, ChevronLeft, Lightbulb, AlertTriangle, RefreshCw, Target } from 'lucide-react';
import api from '../../api/client';
import Card from './cards/Card';
import MemoryCurveChart from './widgets/MemoryCurveChart';
import { formatDuration, formatWordCount } from './utils';

/**
 * Unified Learning Analytics Dashboard
 * Combines: Study Time, Reading Stats, Memory Curve, and Sentence Study Profile
 */
const PerformanceReport = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get(`/api/performance?days=${days}`),
            fetch('/api/sentence-study/profile').then(r => r.ok ? r.json() : null)
        ])
            .then(([performanceData, profileData]) => {
                setData(performanceData);
                setProfile(profileData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch error:", err);
                setLoading(false);
            });
    }, [days]);

    if (loading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-bg-base font-mono gap-4">
                <div className="w-12 h-12 border-4 border-border border-t-accent-primary rounded-none animate-spin"></div>
                <div className="text-accent-primary tracking-widest animate-pulse">{'>>'} LOADING METRICS...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8 text-center text-accent-danger font-mono bg-bg-base h-full flex flex-col items-center justify-center">
                <div className="border border-accent-danger p-4">ERROR: FAILED_TO_LOAD_DATA</div>
            </div>
        );
    }

    const { study_time, reading_stats, memory_curve } = data;

    return (
        <section className="h-full w-full bg-bg-base overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            {/* Header */}
            <header className="mb-8 border-b border-border pb-6">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate('/nav')}
                        className="p-2 hover:bg-bg-surface transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-text-primary" />
                    </button>
                    <div className="w-1 h-12 bg-accent-primary"></div>
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-text-primary mb-1">学习报告</h2>
                        <p className="text-text-muted text-sm font-mono uppercase tracking-widest">{'>>'} Learning Analytics</p>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div className="flex gap-2 font-mono text-sm">
                    {[7, 30, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1 border transition-colors ${days === d
                                ? 'bg-accent-primary text-black border-accent-primary'
                                : 'border-border text-text-muted hover:border-text-secondary'
                                }`}
                        >
                            {d} DAYS
                        </button>
                    ))}
                </div>

                {/* Debug Link */}
                <button
                    onClick={() => navigate('/performance/debug')}
                    className="ml-auto px-3 py-1 border border-border text-text-muted hover:border-accent-primary hover:text-accent-primary flex items-center gap-2 font-mono text-xs transition-colors"
                >
                    <RefreshCw className="w-3 h-3" />
                    ALGO_DEBUG
                </button>
            </header>

            {/* Recommendation Banner (from ProfileStats) */}
            {profile?.recommendation && (
                <div className="bg-accent-primary/10 border border-accent-primary p-4 flex items-center gap-3 mb-6">
                    <Lightbulb className="w-6 h-6 text-accent-primary flex-shrink-0" />
                    <div>
                        <span className="text-xs text-accent-primary font-mono">NEXT_ACTION</span>
                        <p className="text-text-primary font-serif">{profile.recommendation}</p>
                    </div>
                </div>
            )}

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Study Time Card */}
                <div
                    onClick={() => navigate('/performance/time')}
                    className="bg-bg-surface border border-border p-4 md:p-6 relative group hover:border-accent-primary transition-colors cursor-pointer"
                >
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent-primary/30"></div>
                    <Clock className="text-accent-primary opacity-70 mb-2" size={20} />
                    <div className="text-2xl md:text-3xl font-mono font-bold text-accent-primary mb-1">
                        {formatDuration(study_time?.total_minutes || 0)}
                    </div>
                    <div className="text-sm font-serif text-text-primary">学习时长</div>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-[10px] font-mono text-accent-primary">DETAILS {'>>'}</div>
                    </div>
                </div>

                {/* Reading Words Card */}
                <div className="bg-bg-surface border border-border p-4 md:p-6 relative group hover:border-accent-primary transition-colors">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent-primary/30"></div>
                    <BookOpen className="text-accent-primary opacity-70 mb-2" size={20} />
                    <div className="text-2xl md:text-3xl font-mono font-bold text-accent-primary mb-1">
                        {formatWordCount(reading_stats?.total_words || 0)}
                    </div>
                    <div className="text-sm font-serif text-text-primary">阅读字数</div>
                </div>

                {/* Articles Count Card */}
                <div className="bg-bg-surface border border-border p-4 md:p-6 relative group hover:border-accent-primary transition-colors">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent-primary/30"></div>
                    <FileText className="text-accent-primary opacity-70 mb-2" size={20} />
                    <div className="text-2xl md:text-3xl font-mono font-bold text-accent-primary mb-1">
                        {reading_stats?.articles_count || 0}
                    </div>
                    <div className="text-sm font-serif text-text-primary">已读文章</div>
                </div>

                {/* Clear Rate Card (from ProfileStats) */}
                <div className="bg-bg-surface border border-border p-4 md:p-6 relative group hover:border-accent-primary transition-colors">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent-primary/30"></div>
                    <Target className="text-accent-primary opacity-70 mb-2" size={20} />
                    <div className="text-2xl md:text-3xl font-mono font-bold text-accent-primary mb-1">
                        {profile ? Math.round((profile.clear_rate || 0) * 100) : 0}%
                    </div>
                    <div className="text-sm font-serif text-text-primary">一次通过率</div>
                </div>
            </div>

            {/* Gap Breakdown Section (from ProfileStats) */}
            {profile && profile.unclear_count > 0 && (
                <Card title="问题类型分布" icon={AlertTriangle}>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-text-primary w-24">词汇问题</span>
                            <div className="flex-1 bg-bg-elevated h-4 relative overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-accent-primary/70"
                                    style={{
                                        width: `${Math.min((profile.vocab_gap_count / profile.unclear_count * 100), 100)}%`
                                    }}
                                />
                            </div>
                            <span className="text-sm text-text-muted w-8">{profile.vocab_gap_count}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-text-primary w-24">语法问题</span>
                            <div className="flex-1 bg-bg-elevated h-4 relative overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-accent-danger/70"
                                    style={{
                                        width: `${Math.min((profile.grammar_gap_count / profile.unclear_count * 100), 100)}%`
                                    }}
                                />
                            </div>
                            <span className="text-sm text-text-muted w-8">{profile.grammar_gap_count}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-text-primary w-24">句意问题</span>
                            <div className="flex-1 bg-bg-elevated h-4 relative overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-accent-warning/70"
                                    style={{
                                        width: `${Math.min(((profile.meaning_gap_count || 0) / profile.unclear_count * 100), 100)}%`
                                    }}
                                />
                            </div>
                            <span className="text-sm text-text-muted w-8">{profile.meaning_gap_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-text-primary w-24">固定搭配</span>
                            <div className="flex-1 bg-bg-elevated h-4 relative overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-accent-info/70"
                                    style={{
                                        width: `${Math.min((profile.collocation_gap_count / profile.unclear_count * 100), 100)}%`
                                    }}
                                />
                            </div>
                            <span className="text-sm text-text-muted w-8">{profile.collocation_gap_count}</span>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-text-muted font-mono">
                        共 {profile.total_sentences_studied} 句子 | {profile.clear_count} 一次看懂 | {profile.unclear_count} 需要帮助
                    </div>
                </Card>
            )}

            {/* Two-Column Grid for Memory Curve and Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Memory Curve Section */}
                {memory_curve && memory_curve.total_words_analyzed > 0 ? (
                    <Card title="记忆曲线" icon={Brain}>
                        <MemoryCurveChart data={memory_curve} />
                    </Card>
                ) : (
                    <Card title="记忆曲线" icon={Brain}>
                        <div className="text-center py-8 text-text-muted font-mono">
                            <Brain className="mx-auto mb-3 opacity-30" size={36} />
                            <div className="text-sm">暂无足够数据</div>
                            <div className="text-xs mt-1">完成一些复习后，这里会显示你的记忆曲线</div>
                        </div>
                    </Card>
                )}

                {/* Insights (from ProfileStats) */}
                {profile?.insights && profile.insights.length > 0 ? (
                    <Card title="学习建议" icon={Lightbulb}>
                        <div className="space-y-2">
                            {profile.insights.map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm text-text-primary">
                                    <AlertTriangle className="w-4 h-4 text-accent-warning flex-shrink-0 mt-0.5" />
                                    {insight}
                                </div>
                            ))}
                        </div>
                    </Card>
                ) : (
                    <Card title="学习建议" icon={Lightbulb}>
                        <div className="text-center py-8 text-text-muted font-mono">
                            <Lightbulb className="mx-auto mb-3 opacity-30" size={36} />
                            <div className="text-sm">继续学习</div>
                            <div className="text-xs mt-1">完成更多练习后，这里会显示个性化建议</div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Words to Review (from ProfileStats) */}
            {profile?.words_to_review && profile.words_to_review.length > 0 && (
                <Card title="需要加强的词汇" icon={Lightbulb}>
                    <p className="text-xs text-text-muted mb-4">这些词你多次点击查询，说明还没完全掌握</p>
                    <div className="flex flex-wrap gap-2">
                        {profile.words_to_review.slice(0, 20).map((w, idx) => (
                            <span
                                key={idx}
                                className="px-3 py-1 bg-accent-primary/10 border border-accent-primary/30 text-accent-primary text-sm font-mono"
                                title={`难度: ${w.difficulty_score}, 查询次数: ${w.exposure_count}`}
                            >
                                {w.word}
                            </span>
                        ))}
                    </div>
                </Card>
            )}
        </section>
    );
};

export default PerformanceReport;
