import { useState } from 'react';
import { useGlobalState } from '../context/GlobalContext';
import { fetchTheme, fetchSentences, fetchScenario, startChat } from '../api/client';

export const useTheme = () => {
  const { state, actions } = useGlobalState();
  const [error, setError] = useState(null);
  const loading = state.isLoading;  // Use global loading state

  const loadTheme = async (topic, shuffle = false) => {
    if (!topic) return;

    actions.setLoading(true);  // Set global loading
    setError(null);

    try {
      const previousVocab = shuffle ? state.vocab : null;
      console.log("Fetching theme for:", topic);
      
      const vocab = await fetchTheme(topic, previousVocab);
      
      actions.clearCaches();
      actions.setTopic(topic);
      actions.setVocab(vocab);
      actions.setLayer('present'); // Default layer

      // Pre-fetch other data (matching legacy behavior)
      // Note: In React we could lazy load, but sticking to legacy for 1:1 behavior first
      // Build payload for sentences (Matrix)
      const v = vocab.verbs && vocab.verbs[0] ? vocab.verbs[0] : { base: "study", past: "studied", participle: "studied" };
      const slots = vocab.slots || {};
      
      const sentencePayload = {
        topic: topic,
        time_layer: 'present',
        subject: (slots.subject || [])[0] || "I",
        verb_base: v.base,
        verb_past: v.past,
        verb_participle: v.participle,
        object: (slots.object || [])[0] || "",
        manner: (slots.manner || [])[0] || "",
        place: (slots.place || [])[0] || "",
        time: (slots.time || [])[0] || ""
      };

      // Fetch independently and update state as they arrive
      
      // 1. Sentences
      // 1. Sentences
      actions.addLoadingLayer('present'); // Mark as loading globally so Drill doesn't re-fetch
      const p1 = fetchSentences(sentencePayload)
        .then(data => {
            actions.cacheSentences('present', data);
            actions.removeLoadingLayer('present');
        })
        .catch(e => {
            console.error("Sentences failed", e);
            actions.removeLoadingLayer('present');
        });

      // 2. Scenario
      const p3 = fetchScenario(topic, 'present')
        .then(data => actions.cacheScenario(`${topic}_present`, data))
        .catch(e => console.error("Scenario failed", e));

      // 3. Chat
      const p4 = startChat(topic, 'present')
        .then(data => actions.cacheChat(`${topic}_simple`, data))
        .catch(e => console.error("Chat failed", e));
      
      // 4. Streaming Story (with throttled updates to prevent UI jank)
      const processStoryStream = new Promise((resolve, reject) => {
          let currentContent = "";
          let lastUpdateTime = 0;
          const THROTTLE_MS = 200; // Update UI at most every 200ms
          
          import('../api/client').then(({ fetchStoryStream }) => {
              fetchStoryStream(
                  topic, 
                  'present',
                  (chunk) => {
                      currentContent += chunk;
                      const now = Date.now();
                      // Throttle UI updates to prevent sidebar from freezing
                      if (now - lastUpdateTime > THROTTLE_MS) {
                          lastUpdateTime = now;
                          actions.cacheStory(`${topic}_present`, {
                              title: topic, 
                              content: currentContent,
                              highlights: [],
                              grammar_notes: []
                          });
                      }
                  },
                  (fullStory) => {
                      if (fullStory) {
                          actions.cacheStory(`${topic}_present`, fullStory);
                          resolve(fullStory);
                      } else {
                          // Stream ended without metadata (legacy or error)
                          // Construct story from what we have
                          actions.cacheStory(`${topic}_present`, {
                              title: topic,
                              content: currentContent,
                              highlights: [],
                              grammar_notes: []
                          });
                          resolve({ content: currentContent });
                      }
                  }
              ).catch(reject);
          });
      });

      // Wait for all to complete (so 'loading' spinner covers the whole duration)
      await Promise.all([p1, p3, p4, processStoryStream]);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load theme");
    } finally {
      actions.setLoading(false);
    }
  };

  return { loadTheme, loading, error };
};

