import React from 'react';
import { FileText, BookOpen, Headphones } from 'lucide-react';

/**
 * Source Distribution - Learning sources breakdown
 */
const SourceDistribution = ({ sources }) => {
    const icons = {
        epub: FileText,
        rss: FileText,
        dictionary: BookOpen,
        voice: Headphones,
        podcast: Headphones
    };

    const labels = {
        epub: 'EPUB 阅读',
        rss: 'RSS 文章',
        dictionary: '词典查询',
        voice: '语音练习',
        podcast: '播客'
    };

    const total = Object.values(sources).reduce((a, b) => a + b, 0) || 1;
    const entries = Object.entries(sources).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
        return <div className="text-ink-muted font-mono text-sm italic">{'>>'} No learning activity yet</div>;
    }

    return (
        <div className="space-y-2">
            {entries.map(([key, count]) => {
                const Icon = icons[key] || FileText;
                const pct = Math.round((count / total) * 100);
                return (
                    <div key={key} className="flex items-center gap-3">
                        <Icon size={14} className="text-neon-cyan flex-shrink-0" />
                        <span className="font-mono text-sm text-ink flex-1">{labels[key] || key}</span>
                        <span className="font-mono text-sm text-ink-muted">{count}</span>
                        <span className="font-mono text-xs text-neon-cyan">{pct}%</span>
                    </div>
                );
            })}
        </div>
    );
};

export default SourceDistribution;
