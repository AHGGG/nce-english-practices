/**
 * Performance Report Package
 * 
 * Modular components for the learning analytics dashboard.
 */

// Main entry point
export { default } from './PerformanceReport';
export { default as PerformanceReport } from './PerformanceReport';

// Cards
export { KPICard } from './cards/KPICard';
export { DueReviewsCard, StreakCard, ReadingStatsCard } from './cards/ActionCards';
export { default as Card } from './cards/Card';

// Widgets
export { default as MilestoneBadges } from './widgets/MilestoneBadges';
export { default as VocabDistribution } from './widgets/VocabDistribution';
export { default as ActivityHeatmap } from './widgets/ActivityHeatmap';
export { default as DifficultWords } from './widgets/DifficultWords';
export { default as SourceDistribution } from './widgets/SourceDistribution';
export { default as RecentWords } from './widgets/RecentWords';
export { default as DailyGoalsPanel } from './widgets/DailyGoalsPanel';
export { default as MemoryCurveChart } from './widgets/MemoryCurveChart';

// Utils
export { formatDuration, formatWordCount, getNextMilestone } from './utils';
