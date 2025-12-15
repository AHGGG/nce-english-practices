import React, { createContext, useContext, useState, useMemo } from 'react';

const GlobalContext = createContext(null);

export const GlobalProvider = ({ children }) => {
    const [state, setState] = useState({
        topic: '',
        vocab: null,
        currentLayer: 'present',
        sentences: {},   // cache by time_layer
        stories: {},     // cache by topic_tense
        scenarios: {},   // cache by topic_tense
        chats: {},       // cache by topic_tense
        currentScenario: null,


        isLoading: false,  // Global loading state for theme loading
        loadingLayers: new Set() // Track which layers are currently fetching
    });

    const actions = useMemo(() => ({
        setTopic: (topic) => setState(prev => ({ ...prev, topic })),
        setVocab: (vocab) => setState(prev => ({ ...prev, vocab })),
        setLayer: (layer) => setState(prev => ({ ...prev, currentLayer: layer })),
        setLoading: (isLoading) => setState(prev => ({ ...prev, isLoading })),

        // Loading layer tracking
        addLoadingLayer: (layer) => setState(prev => {
            const newSet = new Set(prev.loadingLayers);
            newSet.add(layer);
            return { ...prev, loadingLayers: newSet };
        }),
        removeLoadingLayer: (layer) => setState(prev => {
            const newSet = new Set(prev.loadingLayers);
            newSet.delete(layer);
            return { ...prev, loadingLayers: newSet };
        }),

        // Cache helpers
        cacheSentences: (layer, data) => setState(prev => ({ ...prev, sentences: { ...prev.sentences, [layer]: data } })),
        cacheStory: (key, data) => setState(prev => ({ ...prev, stories: { ...prev.stories, [key]: data } })),
        cacheScenario: (key, data) => setState(prev => ({ ...prev, scenarios: { ...prev.scenarios, [key]: data } })),
        cacheChat: (key, data) => setState(prev => ({ ...prev, chats: { ...prev.chats, [key]: data } })),

        // Clear caches
        clearCaches: () => setState(prev => ({
            ...prev,
            sentences: {},
            stories: {},
            scenarios: {},
            chats: {}
        })),

        resetState: () => setState({
            topic: '',
            vocab: null,
            currentLayer: 'present',
            sentences: {},
            stories: {},
            scenarios: {},
            chats: {},
            currentScenario: null,
            selectedWord: null,
            selectedContext: null,
            selectedWord: null,
            selectedContext: null,
            isLoading: false,
            loadingLayers: new Set()
        })
    }), []);

    // Memoize context value to reduce re-renders
    const contextValue = React.useMemo(() => ({ state, actions }), [state, actions]);

    return (
        <GlobalContext.Provider value={contextValue}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobalState = () => {
    const context = useContext(GlobalContext);
    if (!context) {
        throw new Error('useGlobalState must be used within a GlobalProvider');
    }
    return context;
};
