import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/**
 * Memory Curve Chart - Using Chart.js for professional visualization
 * Compares user's actual retention vs Ebbinghaus forgetting curve
 */
const MemoryCurveChart = ({ data }) => {
    if (!data || !data.actual || data.actual.length === 0) {
        return (
            <div className="text-text-muted font-mono text-sm italic">
                {'>>'} 数据不足，继续学习后查看
            </div>
        );
    }

    const { actual, ebbinghaus } = data;

    // Calculate metrics
    const validActual = actual.filter(p => p.retention !== null);
    const latestPoint = validActual.length > 0 ? validActual[validActual.length - 1] : null;

    const avgRetention = useMemo(() => {
        if (validActual.length === 0) return 0;
        return validActual.reduce((sum, p) => sum + p.retention, 0) / validActual.length;
    }, [validActual]);

    // Calculate overall performance vs theory
    const performance = useMemo(() => {
        if (validActual.length === 0) return { diff: 0, status: 'neutral' };

        let totalDiff = 0;
        let count = 0;

        validActual.forEach(point => {
            const theoretical = ebbinghaus.find(e => e.day === point.day);
            if (theoretical) {
                totalDiff += (point.retention - theoretical.retention);
                count++;
            }
        });

        if (count === 0) return { diff: 0, status: 'neutral' };

        const avgDiff = (totalDiff / count) * 100;

        if (avgDiff > 3) return { diff: avgDiff, status: 'better' };
        if (avgDiff < -3) return { diff: avgDiff, status: 'worse' };
        return { diff: avgDiff, status: 'neutral' };
    }, [validActual, ebbinghaus]);

    // Prepare chart data - use days as labels
    const maxDay = Math.max(...actual.map(p => p.day), ...ebbinghaus.map(p => p.day));

    // Create unified day labels
    const dayLabels = [];
    for (let d = 0; d <= maxDay; d++) {
        dayLabels.push(d);
    }

    // Map data to labels
    const actualData = dayLabels.map(day => {
        const point = actual.find(p => p.day === day);
        return point && point.retention !== null ? point.retention * 100 : null;
    });

    const ebbinghausData = dayLabels.map(day => {
        const point = ebbinghaus.find(p => p.day === day);
        return point ? point.retention * 100 : null;
    });

    // Chart configuration
    const chartData = {
        labels: dayLabels,
        datasets: [
            {
                label: '你的记忆曲线',
                data: actualData,
                borderColor: 'rgb(34, 211, 238)', // cyan-400
                backgroundColor: (context) => {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return 'rgba(34, 211, 238, 0.1)';

                    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.02)');
                    gradient.addColorStop(1, 'rgba(34, 211, 238, 0.25)');
                    return gradient;
                },
                borderWidth: 2.5,
                fill: true,
                tension: 0.4, // Smooth curve
                pointRadius: (context) => {
                    // Larger point for latest data
                    const index = context.dataIndex;
                    const value = context.dataset.data[index];
                    if (value === null) return 0;

                    const lastValidIndex = actualData.reduce((last, val, i) => val !== null ? i : last, 0);
                    return index === lastValidIndex ? 5 : 3;
                },
                pointBackgroundColor: 'rgb(34, 211, 238)',
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                pointHoverRadius: 6,
                spanGaps: true,
            },
            {
                label: '艾宾浩斯遗忘曲线',
                data: ebbinghausData,
                borderColor: 'rgba(148, 163, 184, 0.6)', // slate-400
                borderWidth: 1.5,
                borderDash: [6, 4],
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 3,
                spanGaps: true,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false, // We'll use custom legend
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#e2e8f0',
                bodyColor: '#cbd5e1',
                borderColor: 'rgba(34, 211, 238, 0.3)',
                borderWidth: 1,
                padding: 10,
                displayColors: true,
                callbacks: {
                    title: (items) => `第 ${items[0].label} 天`,
                    label: (item) => {
                        const value = item.parsed.y;
                        if (value === null) return null;
                        return `${item.dataset.label}: ${value.toFixed(0)}%`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                border: {
                    color: 'rgba(148, 163, 184, 0.3)',
                },
                ticks: {
                    color: 'rgba(148, 163, 184, 0.7)',
                    font: {
                        family: 'JetBrains Mono, monospace',
                        size: 9,
                    },
                    maxTicksLimit: 5,
                    callback: (value, index) => {
                        if (index === 0) return '今天';
                        return `${value}d`;
                    },
                },
            },
            y: {
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                    drawTicks: false,
                },
                border: {
                    color: 'rgba(148, 163, 184, 0.3)',
                },
                ticks: {
                    color: 'rgba(148, 163, 184, 0.7)',
                    font: {
                        family: 'JetBrains Mono, monospace',
                        size: 9,
                    },
                    stepSize: 50,
                    callback: (value) => `${value}%`,
                },
            },
        },
    };

    // Get status color and text
    const getStatusConfig = () => {
        switch (performance.status) {
            case 'better':
                return {
                    icon: TrendingUp,
                    color: 'text-accent-success',
                    text: '优于理论',
                    sign: '+',
                };
            case 'worse':
                return {
                    icon: TrendingDown,
                    color: 'text-accent-warning',
                    text: '低于理论',
                    sign: '',
                };
            default:
                return {
                    icon: Minus,
                    color: 'text-text-muted',
                    text: '符合理论',
                    sign: '',
                };
        }
    };

    const statusConfig = getStatusConfig();
    const StatusIcon = statusConfig.icon;

    return (
        <div className="space-y-3">
            {/* Header with key metric */}
            <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-3">
                    <div>
                        <span className="text-text-muted text-xs font-mono">记忆指数</span>
                        <div className="text-2xl font-bold text-accent-info font-mono">
                            {Math.round(avgRetention * 100)}%
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm font-mono">
                            {statusConfig.sign}{Math.abs(performance.diff).toFixed(0)}% {statusConfig.text}
                        </span>
                    </div>
                </div>
                {latestPoint && (
                    <div className="text-right">
                        <span className="text-text-muted text-xs font-mono">最新</span>
                        <div className="text-lg font-bold text-text-primary font-mono">
                            {Math.round(latestPoint.retention * 100)}%
                        </div>
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="h-28">
                <Line data={chartData} options={chartOptions} />
            </div>

            {/* Footer with legend and stats */}
            <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-4 h-0.5 rounded-full"
                            style={{
                                backgroundColor: 'rgb(34, 211, 238)',
                                boxShadow: '0 0 4px rgb(34, 211, 238)'
                            }}
                        />
                        <span>实际</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-4 h-0.5 rounded-full"
                            style={{
                                background: 'repeating-linear-gradient(to right, rgba(148, 163, 184, 0.6) 0, rgba(148, 163, 184, 0.6) 3px, transparent 3px, transparent 5px)'
                            }}
                        />
                        <span>理论</span>
                    </div>
                </div>
                <span>{data.total_words_analyzed} 个词的复习数据</span>
            </div>
        </div>
    );
};

export default MemoryCurveChart;
