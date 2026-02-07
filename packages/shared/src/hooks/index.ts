export * from "./useArticleList";
export * from "./useArticleReader";
export * from "./useReadingTracker";
export * from "./useWordExplainer";
export * from "./useReviewQueue";
export * from "./usePerformanceStats";
export * from "./usePodcast";
export * from "./useNegotiationSession";
export * from "./useSentenceStudy";
export * from "./useSentenceExplainer";

// New (Phase 1)
export { useWordInteraction } from "./useWordInteraction";
export {
  useVocabularyHighlight,
  HIGHLIGHT_OPTIONS,
} from "./useVocabularyHighlight";
export { useLearningIntegration } from "./useLearningIntegration";

// New (Phase 2)
export {
  useAudioPlayer,
  PLAYBACK_RATES,
  type AudioSegment,
  type UseAudioPlayerOptions,
  type AudioPlayerState,
  type AudioPlayerActions,
  type UseAudioPlayerReturn,
} from "./useAudioPlayer";
