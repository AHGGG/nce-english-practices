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
        selectedWord: null,
        selectedContext: null,
        isLoading: false  // Global loading state for theme loading
    });

    const actions = useMemo(() => ({
        setTopic: (topic) => setState(prev => ({ ...prev, topic })),
        setVocab: (vocab) => setState(prev => ({ ...prev, vocab })),
        setLayer: (layer) => setState(prev => ({ ...prev, currentLayer: layer })),
        setLoading: (isLoading) => setState(prev => ({ ...prev, isLoading })),

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
            isLoading: false
        })
    }), []);

    return (
        <GlobalContext.Provider value={{ state, actions }}>
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
