/**
 * Reading Mode Package
 *
 * Modular components for the article reading experience.
 */

// Main entry point
export { default } from "./ReadingMode";
export { default as ReadingMode } from "./ReadingMode";

// Sub-components (for advanced usage)
export { default as ArticleListView } from "./ArticleListView";
export { default as ReaderView } from "./ReaderView";
export { default as WordInspector } from "./WordInspector";
export { default as Lightbox } from "./Lightbox";
export { default as MemoizedSentence } from "./MemoizedSentence";
export { default as MemoizedImage } from "./MemoizedImage";
export { default as RecommendModal } from "./RecommendModal";

// Constants
export { BATCH_SIZE, HIGHLIGHT_OPTIONS } from "./constants";
