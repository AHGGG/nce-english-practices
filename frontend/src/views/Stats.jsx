import React, { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Activity, Trophy, CheckCircle2, Clock4, CircleX } from 'lucide-react';
import api from '../api/client'; // Assuming default export exists or named, checking client.js

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Stats = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/api/stats')
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Stats Fetch Error:", err);
                console.error("Error Details:", err.response || err.message);
                setLoading(false);
            });
    }, []);


    if (loading) return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-bg font-mono gap-4">
            <div className="w-12 h-12 border-4 border-ink-faint border-t-neon-cyan rounded-none animate-spin"></div>
            <div className="text-neon-cyan tracking-widest animate-pulse">{'>>'} ACCESSING USER METRICS...</div>
        </div>
    );

    if (!stats) return (
        <div className="p-8 text-center text-neon-pink font-mono bg-bg h-full flex flex-col items-center justify-center">
            <div className="border border-neon-pink p-4">
                ERROR: FAILED_TO_LOAD_STATS
            </div>
        </div>
    );

    const activityStats = stats.activities || [];
    const totalXp = stats.total_xp || 0;
    const totalTime = stats.total_minutes || 0;

    const totalCount = activityStats.reduce((sum, item) => sum + item.count, 0);
    const totalPassed = activityStats.reduce((sum, item) => sum + item.passed, 0);
    const winRate = totalCount > 0 ? Math.round((totalPassed / totalCount) * 100) : 0;

    // Chart Data
    const chartData = {
        labels: activityStats.map(d => d.activity_type.toUpperCase()),
        datasets: [
            {
                label: 'Passed',
                data: activityStats.map(d => d.passed),
                backgroundColor: '#00FF94', // neon-green
                borderRadius: 0,
            },
            {
                label: 'Total',
                data: activityStats.map(d => d.count),
                backgroundColor: '#06b6d4', // neon-cyan
                borderRadius: 0,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#888888', font: { family: '"JetBrains Mono", monospace' } }
            },
            title: {
                display: true,
                text: 'ACTIVITY_LOG // ANALYTICS',
                color: '#E0E0E0',
                font: { family: '"JetBrains Mono", monospace', weight: 'bold' },
                align: 'start',
                padding: { bottom: 20 }
            },
            tooltip: {
                backgroundColor: '#111',
                titleColor: '#00FF94',
                bodyColor: '#E0E0E0',
                borderColor: '#333',
                borderWidth: 1,
                cornerRadius: 0,
                titleFont: { family: '"JetBrains Mono", monospace' },
                bodyFont: { family: '"JetBrains Mono", monospace' },
                padding: 12,
                displayColors: false,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#888888', stepSize: 1, font: { family: '"JetBrains Mono", monospace' } }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#888888', font: { family: '"JetBrains Mono", monospace' } }
            }
        }
    };



    const formatDuration = (seconds) => {
        if (!seconds) return '';
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <section className="h-full w-full bg-bg overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            <header className="mb-8 border-b border-ink-faint pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-1 h-12 bg-neon-purple"></div>
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-ink mb-1">Performance</h2>
                        <p className="text-ink-muted text-sm font-mono uppercase tracking-widest">{'>>'} Agent Status Report</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:flex gap-4 lg:gap-8 bg-bg-elevated p-4 border border-ink-faint shadow-hard w-full lg:w-auto">
                    <div className="text-center flex flex-col items-center min-w-[80px]">
                        <div className="text-2xl font-mono font-bold text-neon-cyan flex items-center gap-1">
                            {totalXp} <Trophy size={14} className="opacity-50" />
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mt-1">XP_TOTAL</div>
                    </div>
                    <div className="w-px bg-ink-faint self-stretch hidden lg:block"></div>
                    <div className="text-center flex flex-col items-center min-w-[80px]">
                        <div className="text-2xl font-mono font-bold text-neon-green">{winRate}%</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mt-1">SUCCESS_RT</div>
                    </div>
                    <div className="w-px bg-ink-faint self-stretch hidden lg:block"></div>
                    <div className="text-center flex flex-col items-center min-w-[80px]">
                        <div className="text-2xl font-mono font-bold text-ink">{totalCount}</div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mt-1">OPS_COUNT</div>
                    </div>
                    <div className="w-px bg-ink-faint self-stretch hidden lg:block"></div>
                    <div className="text-center flex flex-col items-center min-w-[80px]">
                        <div className="text-2xl font-mono font-bold text-neon-purple flex items-center gap-1">
                            {totalTime} <Clock4 size={14} className="opacity-50" />
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mt-1">MINS_LOG</div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart Card */}
                <div className="bg-bg-paper border border-ink-faint p-6 md:p-8 shadow-hard relative">
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-neon-cyan/30"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-neon-cyan/30"></div>

                    <Bar data={chartData} options={chartOptions} aria-label="Bar chart showing passed vs total activities by type" role="img" />
                </div>

                {/* Recent History */}
                <div className="bg-bg-paper border border-ink-faint p-0 shadow-hard flex flex-col">
                    <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-bg-elevated">
                        <h3 className="text-lg font-mono font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                            <Activity size={18} className="text-neon-pink" />
                            Recent_Ops
                        </h3>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-neon-pink animate-pulse"></div>
                            <div className="w-2 h-2 bg-neon-pink/50"></div>
                            <div className="w-2 h-2 bg-neon-pink/20"></div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[400px] p-0 custom-scrollbar" role="list" aria-label="Recent activities">
                        {stats.recent && stats.recent.length > 0 ? (
                            stats.recent.map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 border-b border-ink-faint hover:bg-white/5 transition-colors group" role="listitem">
                                    <div className={`flex-none w-10 h-10 border flex items-center justify-center ${item.is_pass ? 'bg-neon-green/10 text-neon-green border-neon-green' : 'bg-neon-pink/10 text-neon-pink border-neon-pink'}`}>
                                        {item.is_pass ? <CheckCircle2 size={18} /> : <CircleX size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono font-bold text-ink uppercase tracking-wider">{item.activity_type}</span>
                                            <span className="text-[10px] font-mono text-ink-muted border border-ink-faint px-1">{item.tense}</span>
                                            {item.duration_seconds > 0 && (
                                                <span className="text-[10px] font-mono text-neon-purple border border-neon-purple/30 px-1 flex items-center gap-1">
                                                    <Clock4 size={10} />
                                                    {formatDuration(item.duration_seconds)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-ink-muted truncate font-serif italic">"{item.topic}"</div>
                                    </div>
                                    <div className="text-xs font-mono text-ink-muted whitespace-nowrap opacity-60">
                                        {new Date(item.created_at).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-ink-muted font-mono text-center py-12 italic opacity-50">{'>>'} NO_DATA_FOUND</div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Stats;
