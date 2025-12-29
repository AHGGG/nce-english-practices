import React, { useEffect, useState } from 'react';
import {
    BookOpen,
    Brain,
    Lightbulb,
    Clock,
    AlertTriangle,
    TrendingUp,
    FileText,
    Headphones,
    BookMarked,
    Search,
    Award,
    Flame,
    RefreshCw,
    BookText
} from 'lucide-react';
import api from '../api/client';

/**
 * Performance Report Page
 * Business-aligned metrics for English learning progress.
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

    const { summary, vocabulary, activity, sources, due_reviews_count, milestones, reading_stats } = data;

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

            {/* Main KPI Cards + V2 Action Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KPICard
                    icon={BookOpen}
                    value={summary.vocab_size}
                    label="词汇量"
                    sublabel="正在学习/已掌握"
                    color="neon-cyan"
                />
                <KPICard
                    icon={Brain}
                    value={`${Math.round(summary.mastery_rate * 100)}%`}
                    label="掌握率"
                    sublabel="mastered / total"
                    color="neon-green"
                />
                <KPICard
                    icon={Lightbulb}
                    value={`${Math.round(summary.comprehension_score * 100)}%`}
                    label="理解力"
                    sublabel="首次就懂的比例"
                    color="neon-purple"
                />
                <KPICard
                    icon={Clock}
                    value={formatDuration(summary.total_study_minutes)}
                    label="学习时长"
                    sublabel="累计投入"
                    color="neon-pink"
                />
            </div>

            {/* V2: Action Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <DueReviewsCard count={due_reviews_count || 0} />
                <StreakCard streak={milestones?.current_streak || 0} />
                <ReadingStatsCard stats={reading_stats} />
                <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative flex flex-col justify-center items-center text-center">
                    <div className="text-sm font-mono text-ink-muted mb-1">下一里程碑</div>
                    <div className="text-lg font-mono font-bold text-neon-cyan">
                        {getNextMilestone(milestones)}
                    </div>
                </div>
            </div>


            {/* V2: Milestones Section */}
            {milestones && (
                <div className="mb-8">
                    <Card title="成就徽章" icon={Award}>
                        <MilestoneBadges milestones={milestones} />
                    </Card>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    {/* Vocabulary Distribution */}
                    <Card title="词汇进度" icon={TrendingUp}>
                        <VocabDistribution distribution={vocabulary.distribution} />
                    </Card>

                    {/* Activity Heatmap */}
                    <Card title="活动热力图" icon={FileText}>
                        <ActivityHeatmap dailyCounts={activity.daily_counts} days={days} />
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Difficult Words */}
                    <Card title="难词榜" icon={AlertTriangle}>
                        <DifficultWords words={vocabulary.difficult_words} />
                    </Card>

                    {/* Learning Sources */}
                    <Card title="学习来源" icon={BookMarked}>
                        <SourceDistribution sources={sources.distribution} />
                    </Card>

                    {/* Recent Words */}
                    <Card title="最近学习" icon={Search}>
                        <RecentWords words={vocabulary.recent_words} />
                    </Card>
                </div>
            </div>
        </section>
    );
};

// --- Sub-components ---

const KPICard = ({ icon: Icon, value, label, sublabel, color }) => (
    <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative group hover:border-ink transition-colors">
        <div className={`absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-${color}/30`}></div>
        <div className="flex items-start justify-between mb-2">
            <Icon className={`text-${color} opacity-70`} size={20} />
        </div>
        <div className={`text-2xl md:text-3xl font-mono font-bold text-${color} mb-1`}>{value}</div>
        <div className="text-sm font-serif text-ink">{label}</div>
        <div className="text-xs font-mono text-ink-muted mt-1">{sublabel}</div>
    </div>
);

// V2: Due Reviews Card
const DueReviewsCard = ({ count }) => (
    <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative group hover:border-neon-pink transition-colors">
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-pink/30"></div>
        <div className="flex items-start justify-between mb-2">
            <RefreshCw className="text-neon-pink opacity-70" size={20} />
        </div>
        <div className="text-2xl md:text-3xl font-mono font-bold text-neon-pink mb-1">{count}</div>
        <div className="text-sm font-serif text-ink">待复习</div>
        <div className="text-xs font-mono text-ink-muted mt-1">SRS due today</div>
    </div>
);

// V2: Streak Card
const StreakCard = ({ streak }) => (
    <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative group hover:border-neon-cyan transition-colors">
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-cyan/30"></div>
        <div className="flex items-start justify-between mb-2">
            <Flame className="text-neon-cyan opacity-70" size={20} />
        </div>
        <div className="text-2xl md:text-3xl font-mono font-bold text-neon-cyan mb-1">{streak} 天</div>
        <div className="text-sm font-serif text-ink">连续学习</div>
        <div className="text-xs font-mono text-ink-muted mt-1">current streak</div>
    </div>
);

// V2: Reading Stats Card
const ReadingStatsCard = ({ stats }) => (
    <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative group hover:border-neon-green transition-colors">
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-green/30"></div>
        <div className="flex items-start justify-between mb-2">
            <BookText className="text-neon-green opacity-70" size={20} />
        </div>
        <div className="text-2xl md:text-3xl font-mono font-bold text-neon-green mb-1">
            {formatWordCount(stats?.total_words_read || 0)}
        </div>
        <div className="text-sm font-serif text-ink">阅读字数</div>
        <div className="text-xs font-mono text-ink-muted mt-1">{stats?.articles_count || 0} articles</div>
    </div>
);

const Card = ({ title, icon: Icon, children }) => (
    <div className="bg-bg-paper border border-ink-faint shadow-hard">
        <div className="p-4 border-b border-ink-faint flex items-center gap-2 bg-bg-elevated">
            <Icon size={16} className="text-neon-cyan" />
            <h3 className="font-mono font-bold text-ink uppercase tracking-wider text-sm">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// V2: Milestone Badges
const MilestoneBadges = ({ milestones }) => {
    if (!milestones) return null;

    return (
        <div className="space-y-6">
            {/* Vocab Milestones */}
            <div>
                <h4 className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-3">词汇量成就</h4>
                <div className="flex flex-wrap gap-2">
                    {milestones.vocab_milestones?.map((m, i) => (
                        <div
                            key={i}
                            className={`px-3 py-2 border flex items-center gap-2 transition-all ${m.achieved
                                ? 'border-neon-green bg-neon-green/10 text-neon-green'
                                : 'border-ink-faint text-ink-muted opacity-50'
                                }`}
                            title={`${m.name}: ${m.threshold} words`}
                        >
                            <span className="text-lg">{m.icon}</span>
                            <div>
                                <div className="font-mono text-xs font-bold">{m.threshold}</div>
                                <div className="text-[10px] uppercase">{m.name}</div>
                            </div>
                            {!m.achieved && (
                                <div className="w-8 h-1 bg-bg-elevated ml-2">
                                    <div className="h-full bg-neon-cyan" style={{ width: `${m.progress * 100}%` }}></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Streak Milestones */}
            <div>
                <h4 className="text-xs font-mono text-ink-muted uppercase tracking-wider mb-3">连续学习成就</h4>
                <div className="flex flex-wrap gap-2">
                    {milestones.streak_milestones?.map((m, i) => (
                        <div
                            key={i}
                            className={`px-3 py-2 border flex items-center gap-2 transition-all ${m.achieved
                                ? 'border-neon-pink bg-neon-pink/10 text-neon-pink'
                                : 'border-ink-faint text-ink-muted opacity-50'
                                }`}
                            title={`${m.name}: ${m.threshold} days`}
                        >
                            <span className="text-lg">{m.icon}</span>
                            <div>
                                <div className="font-mono text-xs font-bold">{m.threshold} days</div>
                                <div className="text-[10px] uppercase">{m.name}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const VocabDistribution = ({ distribution }) => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
    const statuses = [
        { key: 'new', label: '新词', color: 'bg-ink-muted' },
        { key: 'learning', label: '学习中', color: 'bg-neon-cyan' },
        { key: 'mastered', label: '已掌握', color: 'bg-neon-green' }
    ];

    return (
        <div className="space-y-3">
            {statuses.map(({ key, label, color }) => {
                const count = distribution[key] || 0;
                const pct = Math.round((count / total) * 100);
                return (
                    <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-mono text-ink-muted">{label}</span>
                            <span className="font-mono text-ink">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-bg-elevated">
                            <div className={`h-full ${color}`} style={{ width: `${pct}%` }}></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ActivityHeatmap = ({ dailyCounts, days }) => {
    // Generate date grid for last N days
    const today = new Date();
    const grid = [];
    const countMap = {};

    dailyCounts.forEach(d => { countMap[d.date] = d.count; });

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        grid.push({ date: key, count: countMap[key] || 0 });
    }

    const maxCount = Math.max(...grid.map(d => d.count), 1);

    const getIntensity = (count) => {
        if (count === 0) return 'bg-bg-elevated';
        const ratio = count / maxCount;
        if (ratio < 0.25) return 'bg-neon-green/20';
        if (ratio < 0.5) return 'bg-neon-green/40';
        if (ratio < 0.75) return 'bg-neon-green/60';
        return 'bg-neon-green';
    };

    return (
        <div>
            <div className="flex flex-wrap gap-1">
                {grid.map((d, i) => (
                    <div
                        key={i}
                        className={`w-3 h-3 ${getIntensity(d.count)}`}
                        title={`${d.date}: ${d.count} activities`}
                    />
                ))}
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs font-mono text-ink-muted">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 bg-bg-elevated"></div>
                    <div className="w-3 h-3 bg-neon-green/20"></div>
                    <div className="w-3 h-3 bg-neon-green/40"></div>
                    <div className="w-3 h-3 bg-neon-green/60"></div>
                    <div className="w-3 h-3 bg-neon-green"></div>
                </div>
                <span>More</span>
            </div>
        </div>
    );
};

const DifficultWords = ({ words }) => {
    if (!words || words.length === 0) {
        return <div className="text-ink-muted font-mono text-sm italic">{'>>'} No difficult words yet</div>;
    }

    return (
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {words.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-2 border border-ink-faint hover:bg-white/5">
                    <span className="font-serif text-ink">{w.word}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-neon-pink">
                            {Math.round(w.difficulty * 100)}% 难度
                        </span>
                        <span className="text-xs font-mono text-ink-muted">
                            HUH? ×{w.huh_count}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const SourceDistribution = ({ sources }) => {
    const icons = {
        epub: FileText,
        rss: FileText,
        dictionary: BookOpen,
        voice: Headphones,
        podcast: Headphones
    };

    const labels = {
        epub: 'EPUB 阅读',
        rss: 'RSS 文章',
        dictionary: '词典查询',
        voice: '语音练习',
        podcast: '播客'
    };

    const total = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
    const entries = Object.entries(sources).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        return <div className="text-ink-muted font-mono text-sm italic">{'>>'} No learning activity yet</div>;
    }

    return (
        <div className="space-y-2">
            {entries.map(([key, count]) => {
                const Icon = icons[key] || FileText;
                const pct = Math.round((count / total) * 100);
                return (
                    <div key={key} className="flex items-center gap-3">
                        <Icon size={14} className="text-neon-cyan flex-shrink-0" />
                        <span className="font-mono text-sm text-ink flex-1">{labels[key] || key}</span>
                        <span className="font-mono text-sm text-ink-muted">{count}</span>
                        <span className="font-mono text-xs text-neon-cyan">{pct}%</span>
                    </div>
                );
            })}
        </div>
    );
};

const RecentWords = ({ words }) => {
    if (!words || words.length === 0) {
        return <div className="text-ink-muted font-mono text-sm italic">{'>>'} No recent words</div>;
    }

    const sourceColors = {
        epub: 'text-neon-cyan',
        rss: 'text-neon-green',
        dictionary: 'text-neon-purple',
        voice: 'text-neon-pink'
    };

    return (
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
            {words.map((w, i) => (
                <span
                    key={i}
                    className={`px-2 py-1 border border-ink-faint text-sm font-serif ${sourceColors[w.source] || 'text-ink'} hover:bg-white/5`}
                    title={`from ${w.source}`}
                >
                    {w.word}
                </span>
            ))}
        </div>
    );
};

// Helpers
const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

const formatWordCount = (count) => {
    if (count < 1000) return count.toString();
    if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
    return `${Math.round(count / 1000)}k`;
};

const getNextMilestone = (milestones) => {
    if (!milestones) return '—';
    const next = milestones.vocab_milestones?.find(m => !m.achieved);
    if (next) return `${next.icon} ${next.threshold} 词`;
    return '🏆 全部达成!';
};

export default PerformanceReport;
