// Centralized state management for the application

export const state = {
    topic: '',
    vocab: null,
    currentLayer: 'present',
    sentences: {},   // cache by time_layer
    stories: {},     // cache by topic_tense
    scenarios: {},   // cache by topic_tense
    chats: {},       // cache by topic_tense
    currentScenario: null,
    selectedWord: null,
    selectedContext: null
};

// Helper to get cache key for tense-based caching
export function getCacheKey(topic, layer) {
    return `${topic}_${layer}`;
}

// Clear all caches (used when loading new theme)
export function clearCaches() {
    state.sentences = {};
    state.stories = {};
    state.scenarios = {};
    state.chats = {};
}
