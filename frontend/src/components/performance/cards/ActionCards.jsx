import React from 'react';
import { RefreshCw, Flame, BookText } from 'lucide-react';
import { formatWordCount } from '../utils';

/**
 * Due Reviews Card - Shows pending SRS reviews
 */
export const DueReviewsCard = ({ count }) => (
    <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative group hover:border-neon-pink transition-colors">
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-pink/30"></div>
        <div className="flex items-start justify-between mb-2">
            <RefreshCw className="text-neon-pink opacity-70" size={20} />
        </div>
        <div className="text-2xl md:text-3xl font-mono font-bold text-neon-pink mb-1">{count}</div>
        <div className="text-sm font-serif text-ink">待复习</div>
        <div className="text-xs font-mono text-ink-muted mt-1">SRS due today</div>
    </div>
);

/**
 * Streak Card - Shows current learning streak
 */
export const StreakCard = ({ streak }) => (
    <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative group hover:border-neon-cyan transition-colors">
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-cyan/30"></div>
        <div className="flex items-start justify-between mb-2">
            <Flame className="text-neon-cyan opacity-70" size={20} />
        </div>
        <div className="text-2xl md:text-3xl font-mono font-bold text-neon-cyan mb-1">{streak} 天</div>
        <div className="text-sm font-serif text-ink">连续学习</div>
        <div className="text-xs font-mono text-ink-muted mt-1">current streak</div>
    </div>
);

/**
 * Reading Stats Card - Shows reading word count
 */
export const ReadingStatsCard = ({ stats }) => (
    <div className="bg-bg-paper border border-ink-faint p-4 md:p-6 shadow-hard relative group hover:border-neon-green transition-colors">
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-green/30"></div>
        <div className="flex items-start justify-between mb-2">
            <BookText className="text-neon-green opacity-70" size={20} />
        </div>
        <div className="text-2xl md:text-3xl font-mono font-bold text-neon-green mb-1">
            {formatWordCount(stats?.total_words_read || 0)}
        </div>
        <div className="text-sm font-serif text-ink">阅读字数</div>
        <div className="text-xs font-mono text-ink-muted mt-1">{stats?.articles_count || 0} articles</div>
    </div>
);
