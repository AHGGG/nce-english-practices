import React from 'react';

/**
 * Daily Study Time Bar Chart
 * Uses semantic accent colors with inline styles for opacity support
 */

// Chart color definitions using CSS variable values
const CHART_COLORS = {
    reading: { bg: 'rgba(6, 182, 212, 0.8)', solid: '#06b6d4' },      // accent-info (cyan)
    sentence: { bg: 'rgba(0, 255, 148, 0.8)', solid: '#00FF94' },     // accent-primary (green)
    voice: { bg: 'rgba(255, 0, 85, 0.8)', solid: '#FF0055' },         // accent-danger (pink)
    review: { bg: 'rgba(245, 158, 11, 0.8)', solid: '#f59e0b' }       // accent-warning (amber)
};

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
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-text-primary text-bg-base text-[10px] py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono">
                            {d.date}<br />
                            TOTAL: {Math.round(d.total / 60)}m<br />
                            ---<br />
                            READ: {Math.round(d.reading / 60)}m<br />
                            SENT: {Math.round(d.sentence_study / 60)}m<br />
                            VOICE: {Math.round(d.voice / 60)}m<br />
                            REVIEW: {Math.round((d.review || 0) / 60)}m
                        </div>

                        {/* Stacked Bar */}
                        <div className="w-full flex flex-col justify-end overflow-hidden" style={{ height: `${(d.total / maxTime) * 100}%` }}>
                            <div className="w-full" style={{ height: `${(d.reading / d.total) * 100}%`, backgroundColor: CHART_COLORS.reading.bg }} title="Reading"></div>
                            <div className="w-full" style={{ height: `${(d.sentence_study / d.total) * 100}%`, backgroundColor: CHART_COLORS.sentence.bg }} title="Sentence Study"></div>
                            <div className="w-full" style={{ height: `${(d.voice / d.total) * 100}%`, backgroundColor: CHART_COLORS.voice.bg }} title="Voice"></div>
                            <div className="w-full" style={{ height: `${((d.review || 0) / d.total) * 100}%`, backgroundColor: CHART_COLORS.review.bg }} title="Review"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ backgroundColor: CHART_COLORS.reading.solid }}></div>
                    <span className="text-text-muted">阅读模式</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ backgroundColor: CHART_COLORS.sentence.solid }}></div>
                    <span className="text-text-muted">句子学习</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ backgroundColor: CHART_COLORS.voice.solid }}></div>
                    <span className="text-text-muted">语音实验室</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ backgroundColor: CHART_COLORS.review.solid }}></div>
                    <span className="text-text-muted">复习</span>
                </div>
            </div>
        </div>
    );
};

export default StudyTimeChart;
