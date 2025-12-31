import React from 'react';

/**
 * Recent Words - Recently learned vocabulary
 */
const RecentWords = ({ words }) => {
    if (!words || words.length === 0) {
        return <div className="text-ink-muted font-mono text-sm italic">{'>>'} No recent words</div>;
    }

    const sourceColors = {
        epub: 'text-neon-cyan',
        rss: 'text-neon-green',
        dictionary: 'text-neon-purple',
        voice: 'text-neon-pink'
    };

    return (
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
            {words.map((w, i) => (
                <span
                    key={i}
                    className={`px-2 py-1 border border-ink-faint text-sm font-serif ${sourceColors[w.source] || 'text-ink'} hover:bg-white/5`}
                    title={`from ${w.source}`}
                >
                    {w.word}
                </span>
            ))}
        </div>
    );
};

export default RecentWords;
