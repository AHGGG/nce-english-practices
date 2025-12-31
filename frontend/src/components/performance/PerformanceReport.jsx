import React, { useEffect, useState } from 'react';
import {
    BookOpen,
    Brain,
    Lightbulb,
    Clock,
    AlertTriangle,
    TrendingUp,
    FileText,
    BookMarked,
    Search,
    Award,
    Target
} from 'lucide-react';
import api from '../../api/client';

// Cards
import { KPICard } from './cards/KPICard';
import { DueReviewsCard, StreakCard, ReadingStatsCard } from './cards/ActionCards';
import Card from './cards/Card';

// Widgets
import MilestoneBadges from './widgets/MilestoneBadges';
import VocabDistribution from './widgets/VocabDistribution';
import ActivityHeatmap from './widgets/ActivityHeatmap';
import DifficultWords from './widgets/DifficultWords';
import SourceDistribution from './widgets/SourceDistribution';
import RecentWords from './widgets/RecentWords';
import DailyGoalsPanel from './widgets/DailyGoalsPanel';
import MemoryCurveChart from './widgets/MemoryCurveChart';

// Utils
import { formatDuration, getNextMilestone } from './utils';

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

    const { summary, vocabulary, activity, sources, due_reviews_count, milestones, reading_stats, goals_progress, memory_curve } = data;

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

            {/* V3: Daily Goals Progress */}
            {goals_progress && (
                <div className="mb-8">
                    <Card title="今日目标" icon={Target}>
                        <DailyGoalsPanel progress={goals_progress.progress} />
                    </Card>
                </div>
            )}

            {/* V3: Memory Curve */}
            {memory_curve && memory_curve.total_words_analyzed > 0 && (
                <div className="mb-8">
                    <Card title="记忆曲线" icon={Brain}>
                        <MemoryCurveChart data={memory_curve} />
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

export default PerformanceReport;
