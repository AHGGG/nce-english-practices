import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, Calendar, BarChart2 } from 'lucide-react';
import api from '../../api/client';
import Card from './cards/Card';
import StudyTimeChart from './widgets/StudyTimeChart';
import { formatDuration } from './utils';

const StudyTimeDetail = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => {
        setLoading(true);
        api.get(`/api/performance/study-time?days=${days}`)
            .then(res => {
                setData(res);
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
                <div className="text-accent-primary tracking-widest animate-pulse">{'>>'} LOADING_TIME_METRICS...</div>
            </div>
        );
    }

    const totalMinutes = data ? Math.round(data.total_seconds / 60) : 0;
    const avgMinutes = data && data.daily.length > 0
        ? Math.round(totalMinutes / data.daily.length)
        : 0;

    return (
        <section className="h-full w-full bg-bg-base overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            {/* Header */}
            <header className="mb-8 border-b border-border pb-6">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate('/performance')}
                        className="p-2 hover:bg-bg-surface transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6 text-text-primary" />
                    </button>
                    <div className="w-1 h-12 bg-accent-primary"></div>
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-text-primary mb-1">学习时长细节</h2>
                        <p className="text-text-muted text-sm font-mono uppercase tracking-widest">{'>>'} Study Duration Breakdown</p>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div className="flex gap-2 font-mono text-sm">
                    {[7, 14, 30, 90].map(d => (
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
            </header>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-bg-surface border border-border p-6 relative">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent-primary/30"></div>
                    <div className="text-xs text-text-muted font-mono mb-2">TOTAL_PRACTICE_TIME</div>
                    <div className="text-4xl font-mono font-bold text-accent-primary">
                        {formatDuration(totalMinutes)}
                    </div>
                </div>
                <div className="bg-bg-surface border border-border p-6 relative">
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-accent-primary/30"></div>
                    <div className="text-xs text-text-muted font-mono mb-2">DAILY_AVERAGE</div>
                    <div className="text-4xl font-mono font-bold text-accent-primary">
                        {avgMinutes} <span className="text-xl">min</span>
                    </div>
                </div>
            </div>

            {/* Daily Chart */}
            <Card title="每日学习趋势" icon={BarChart2}>
                <div className="pt-4">
                    <StudyTimeChart dailyData={data?.daily || []} />
                </div>
            </Card>

            {/* Raw Data List */}
            <Card title="历史记录" icon={Calendar}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-sm">
                        <thead className="border-b border-border text-text-muted">
                            <tr>
                                <th className="py-2 px-4">DATE</th>
                                <th className="py-2 px-4">READING</th>
                                <th className="py-2 px-4">SENTENCE</th>
                                <th className="py-2 px-4">VOICE</th>
                                <th className="py-2 px-4 text-accent-primary">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {data?.daily.slice().reverse().map((d, idx) => (
                                <tr key={idx} className="hover:bg-bg-surface transition-colors">
                                    <td className="py-2 px-4 text-text-primary">{d.date}</td>
                                    <td className="py-2 px-4 text-text-muted">{Math.round(d.reading / 60)}m</td>
                                    <td className="py-2 px-4 text-text-muted">{Math.round(d.sentence_study / 60)}m</td>
                                    <td className="py-2 px-4 text-text-muted">{Math.round(d.voice / 60)}m</td>
                                    <td className="py-2 px-4 text-accent-primary font-bold">{Math.round(d.total / 60)}m</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </section>
    );
};

export default StudyTimeDetail;
