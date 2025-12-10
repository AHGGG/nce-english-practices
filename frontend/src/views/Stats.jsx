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

    if (loading) return <div className="p-8 text-center text-slate-500">Loading stats...</div>;
    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load stats.</div>;

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
                backgroundColor: '#22c55e',
                borderRadius: 4,
            },
            {
                label: 'Total',
                data: activityStats.map(d => d.count),
                backgroundColor: '#38bdf8',
                borderRadius: 4,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#94a3b8' }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#94a3b8', stepSize: 1 }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    return (
        <section className="h-full w-full bg-[#0f172a] overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            <header className="mb-8 p-6 bg-[#0f172a]/50 backdrop-blur-md rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-500/10 rounded-xl text-2xl">📊</div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Your Progress</h2>
                        <p className="text-slate-400 text-sm">Keep up the good work!</p>
                    </div>
                </div>

                <div className="flex gap-4 md:gap-8">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-sky-400">{totalXp}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">XP</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-400">{winRate}%</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Win Rate</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-400">{totalCount}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Activities</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{totalTime}</div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Mins</div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart Card */}
                <div className="bg-[#0f172a]/50 backdrop-blur-md rounded-2xl border border-white/5 p-6 md:p-8 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Activity Breakdown</h3>
                    <Bar data={chartData} options={chartOptions} />
                </div>

                {/* Recent History */}
                <div className="bg-[#0f172a]/50 backdrop-blur-md rounded-2xl border border-white/5 p-6 md:p-8 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-6">Recent Activity</h3>
                    <div className="space-y-4">
                        {stats.recent && stats.recent.length > 0 ? (
                            stats.recent.map((item, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className={`flex-none w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-lg ${item.is_pass ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {item.is_pass ? '✓' : '✗'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{item.activity_type}</div>
                                        <div className="text-sm text-slate-200 truncate">{item.topic} · {item.tense}</div>
                                    </div>
                                    <div className="text-xs text-slate-500 whitespace-nowrap">
                                        {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-slate-500 italic text-center py-8">No data yet.</div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Stats;
