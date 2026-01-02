/**
 * Performance Report Package
 * 
 * Simplified components for the learning analytics dashboard.
 */

// Main entry point
export { default } from './PerformanceReport';
export { default as PerformanceReport } from './PerformanceReport';

// Cards
export { default as Card } from './cards/Card';

// Widgets
export { default as MemoryCurveChart } from './widgets/MemoryCurveChart';

// Utils
export { formatDuration, formatWordCount } from './utils';
