import React from 'react';

/**
 * Activity Heatmap - GitHub-style activity visualization
 */
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

export default ActivityHeatmap;
