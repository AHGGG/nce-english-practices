import React from 'react';

/**
 * Daily Study Time Bar Chart
 * Uses semantic accent colors with Tailwind classes
 */

const StudyTimeChart = ({ dailyData }) => {
    if (!dailyData || dailyData.length === 0) {
        return <div className="text-text-muted font-mono text-sm italic">{'>>'} NO_DATA_AVAILABLE</div>;
    }

    const maxTime = Math.max(...dailyData.map(d => d.total), 1);

    return (
        <div className="space-y-6">
            <div className="relative h-40 border-l border-b border-border flex items-end gap-1 px-2">
                {/* Y-axis labels */}
                <div className="absolute -left-10 top-0 text-[10px] font-mono text-text-muted">
                    {Math.round(maxTime / 60)}m
                </div>
                <div className="absolute -left-10 bottom-0 text-[10px] font-mono text-text-muted">0m</div>

                {/* Bars */}
                {dailyData.map((d, i) => (
                    <div key={i} className="flex-1 group relative flex flex-col justify-end" style={{ height: '100%' }}>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-text-primary text-bg-base text-[10px] py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono rounded">
                            {d.date}<br />
                            TOTAL: {Math.round(d.total / 60)}m<br />
                            ---<br />
                            READ: {Math.round(d.reading / 60)}m<br />
                            SENT: {Math.round(d.sentence_study / 60)}m<br />
                            VOICE: {Math.round(d.voice / 60)}m<br />
                            REVIEW: {Math.round((d.review || 0) / 60)}m<br />
                            PODCAST: {Math.round((d.podcast || 0) / 60)}m
                        </div>

                        {/* Stacked Bar */}
                        <div className="w-full flex flex-col justify-end overflow-hidden" style={{ height: `${(d.total / maxTime) * 100}%` }}>
                            <div className="w-full bg-accent-info/80" style={{ height: `${(d.reading / d.total) * 100}%` }} title="Reading"></div>
                            <div className="w-full bg-accent-primary/80" style={{ height: `${(d.sentence_study / d.total) * 100}%` }} title="Sentence Study"></div>
                            <div className="w-full bg-accent-danger/80" style={{ height: `${(d.voice / d.total) * 100}%` }} title="Voice"></div>
                            <div className="w-full bg-accent-warning/80" style={{ height: `${((d.review || 0) / d.total) * 100}%` }} title="Review"></div>
                            <div className="w-full bg-purple-500/80" style={{ height: `${((d.podcast || 0) / d.total) * 100}%` }} title="Podcast"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-accent-info"></div>
                    <span className="text-text-muted">阅读模式</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-accent-primary"></div>
                    <span className="text-text-muted">句子学习</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-accent-danger"></div>
                    <span className="text-text-muted">语音实验室</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-accent-warning"></div>
                    <span className="text-text-muted">复习</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500"></div>
                    <span className="text-text-muted">播客</span>
                </div>
            </div>
        </div>
    );
};

export default StudyTimeChart;
