/**
 * Performance Report Utilities
 */

/**
 * Format minutes into human-readable duration
 */
export const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

/**
 * Format word count with K suffix for thousands
 */
export const formatWordCount = (count) => {
    if (count < 1000) return count.toString();
    if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
    return `${Math.round(count / 1000)}k`;
};

/**
 * Get the next unachieved milestone
 */
export const getNextMilestone = (milestones) => {
    if (!milestones) return '—';
    const next = milestones.vocab_milestones?.find(m => !m.achieved);
    if (next) return `${next.icon} ${next.threshold} 词`;
    return '🏆 全部达成!';
};
