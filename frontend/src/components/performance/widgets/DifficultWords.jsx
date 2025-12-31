import React from 'react';

/**
 * Difficult Words - List of words with high difficulty scores
 */
const DifficultWords = ({ words }) => {
    if (!words || words.length === 0) {
        return <div className="text-ink-muted font-mono text-sm italic">{'>>'} No difficult words yet</div>;
    }

    return (
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {words.map((w, i) => (
                <div key={i} className="flex items-center justify-between p-2 border border-ink-faint hover:bg-white/5">
                    <span className="font-serif text-ink">{w.word}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-neon-pink">
                            {Math.round(w.difficulty * 100)}% 难度
                        </span>
                        <span className="text-xs font-mono text-ink-muted">
                            HUH? ×{w.huh_count}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DifficultWords;
