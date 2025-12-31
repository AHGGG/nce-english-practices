import React from 'react';

/**
 * Daily Goals Panel - Circular progress indicators for daily targets
 */
const DailyGoalsPanel = ({ progress }) => {
    if (!progress || Object.keys(progress).length === 0) {
        return <div className="text-ink-muted font-mono text-sm italic">{'>>'} 设置你的每日目标</div>;
    }

    const goalLabels = {
        new_words: '新学单词',
        review_words: '复习单词',
        study_minutes: '学习时长',
        reading_words: '阅读字数'
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(progress).map(([key, value]) => (
                <div key={key} className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                        {/* Background circle */}
                        <svg className="w-full h-full -rotate-90">
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="text-ink-faint"
                            />
                            <circle
                                cx="32"
                                cy="32"
                                r="28"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeDasharray={`${value.percent * 1.76} 176`}
                                className={value.completed ? 'text-neon-green' : 'text-neon-cyan'}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-mono font-bold ${value.completed ? 'text-neon-green' : 'text-ink'}`}>
                                {value.percent}%
                            </span>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-ink-muted">{goalLabels[key] || key}</div>
                    <div className="text-sm font-mono text-ink">
                        <span className={value.completed ? 'text-neon-green' : ''}>{value.actual}</span>
                        <span className="text-ink-faint">/{value.target}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DailyGoalsPanel;
