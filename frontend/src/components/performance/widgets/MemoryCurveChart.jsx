import React from 'react';

/**
 * Memory Curve Chart - Actual vs Ebbinghaus retention curve
 */
const MemoryCurveChart = ({ data }) => {
    if (!data || !data.actual || data.actual.length === 0) {
        return <div className="text-ink-muted font-mono text-sm italic">{'>>'} 数据不足，继续学习后查看</div>;
    }

    const { actual, ebbinghaus } = data;
    const maxDay = 30;
    const chartHeight = 120;

    // Helper to calculate Y position (higher retention = higher on chart)
    const getY = (retention) => retention !== null ? chartHeight - (retention * chartHeight) : null;

    return (
        <div className="space-y-4">
            <div className="relative h-32 border-l border-b border-ink-faint">
                {/* Y-axis labels */}
                <div className="absolute -left-8 top-0 text-[10px] font-mono text-ink-muted">100%</div>
                <div className="absolute -left-8 bottom-0 text-[10px] font-mono text-ink-muted">0%</div>

                {/* Chart area */}
                <svg className="w-full h-full" viewBox={`0 0 300 ${chartHeight}`} preserveAspectRatio="none">
                    {/* Ebbinghaus curve (dashed, gray) */}
                    <polyline
                        fill="none"
                        stroke="#666"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        points={ebbinghaus.map((p, i) => `${(p.day / maxDay) * 300},${getY(p.retention)}`).join(' ')}
                    />

                    {/* Actual curve (solid, cyan) */}
                    <polyline
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        points={actual.filter(p => p.retention !== null).map((p, i) => `${(p.day / maxDay) * 300},${getY(p.retention)}`).join(' ')}
                    />

                    {/* Data points */}
                    {actual.filter(p => p.retention !== null).map((p, i) => (
                        <circle
                            key={i}
                            cx={(p.day / maxDay) * 300}
                            cy={getY(p.retention)}
                            r="4"
                            fill="#06b6d4"
                        />
                    ))}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-neon-cyan"></div>
                    <span className="text-ink-muted">你的曲线</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-ink-muted" style={{ backgroundImage: 'repeating-linear-gradient(to right, #666 0, #666 4px, transparent 4px, transparent 6px)' }}></div>
                    <span className="text-ink-muted">艾宾浩斯理论</span>
                </div>
            </div>

            <div className="text-xs font-mono text-ink-muted">
                分析了 {data.total_words_analyzed} 个单词的记忆数据
            </div>
        </div>
    );
};

export default MemoryCurveChart;
