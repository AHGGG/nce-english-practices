/**
 * Performance Report Package
 * 
 * Simplified components for the learning analytics dashboard.
 */

// Main entry point
export { default } from './PerformanceReport';
export { default as PerformanceReport } from './PerformanceReport';
export { default as StudyTimeDetail } from './StudyTimeDetail';

// Cards
export { default as Card } from './cards/Card';

// Widgets
export { default as MemoryCurveChart } from './widgets/MemoryCurveChart';
export { default as StudyTimeChart } from './widgets/StudyTimeChart';

// Utils
export { formatDuration, formatWordCount } from './utils';
