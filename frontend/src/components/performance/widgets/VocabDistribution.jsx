import React from 'react';

/**
 * Vocab Distribution - Progress bars for vocabulary status
 */
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

export default VocabDistribution;
