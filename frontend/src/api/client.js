import axios from 'axios';

const client = axios.create({
  baseURL: '', // Vite proxy handles /api prefix
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'Request failed';
    return Promise.reject(new Error(typeof msg === 'object' ? JSON.stringify(msg) : msg));
  }
);

// Theme & Vocabulary
export const fetchTheme = async (topic, previousVocab = null) => {
  const payload = { topic };
  if (previousVocab) payload.previous_vocab = previousVocab;
  return client.post('/api/theme', payload);
};

// Sentences (Matrix)
export const fetchSentences = async (payload) => client.post('/api/sentences', payload);

// Story
export const fetchStory = async (topic, targetTense) => client.post('/api/story', { topic, target_tense: targetTense });

export const fetchStoryStream = async (topic, targetTense, onChunk, onComplete) => {
    const response = await fetch('/api/story/stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, target_tense: targetTense }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Split by newline (NDJSON)
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const data = JSON.parse(line);
                if (data.type === 'text') {
                    onChunk(data.chunk);
                } else if (data.type === 'data') {
                    onComplete(data.story);
                }
            } catch (e) {
                console.warn("Stream parse error", e);
            }
        }
    }
    
    // Process final buffer if any
    let finalStory = null;
    if (buffer.trim()) {
         try {
            const data = JSON.parse(buffer);
            if (data.type === 'text') onChunk(data.chunk);
            else if (data.type === 'data') {
                finalStory = data.story;
                onComplete(finalStory);
            }
        } catch (e) {}
    }
    
    // If stream ended but we didn't get a final data packet (e.g. error or just text),
    // ensure we still complete the promise.
    // However, onComplete expects a full story object. 
    // If we only got text, we should construct a partial story?
    if (!finalStory) {
        // We can't know the full story if 'data' event wasn't sent.
        // But we MUST resolve the promise to stop the spinner.
        // We'll signal completion with null or partial data.
        onComplete(null); 
    }
};

// Quiz
export const fetchQuiz = async (topic, tense, aspect, correctSentence) => {
  return client.post('/api/quiz', {
    topic,
    tense,
    aspect: aspect.toLowerCase(),
    correct_sentence: correctSentence,
  });
};

// Scenario
export const fetchScenario = async (topic, tense) => client.post('/api/scenario', { topic, tense, aspect: 'simple' });

export const gradeScenario = async (situation, goal, userInput, tense) => {
  return client.post('/api/scenario/grade', { situation, goal, user_input: userInput, tense });
};

// Chat
export const startChat = async (topic, tense) => client.post('/api/chat/start', { topic, tense, aspect: 'simple' });

export const sendChatReply = async (sessionId, message) => client.post('/api/chat/reply', { session_id: sessionId, message });

export const polishSentence = async (sentence, context = []) => client.post('/api/chat/polish', { sentence, context });

export const addReviewNote = async (original, better, tags = []) => client.post('/api/review/add', { original, better, tags });

// Dictionary
export const lookupDictionary = async (word) => client.post('/api/dictionary/lookup', { word });

export const explainInContext = async (word, sentence) => client.post('/api/dictionary/context', { word, sentence });

// Stats & Logging
export const fetchStats = async () => client.get('/api/stats');

let lastLogTime = Date.now();
export const logAttempt = async (type, topic, tense, isPass, details) => {
  const now = Date.now();
  let duration = Math.round((now - lastLogTime) / 1000);
  if (duration > 300) duration = 60;
  if (duration < 0) duration = 0;
  lastLogTime = now;

  try {
    await client.post('/api/log_attempt', {
      activity_type: type || 'unknown',
      topic: topic || 'unknown',
      tense: tense || 'general',
      is_pass: !!isPass,
      details: details || {},
      duration_seconds: duration,
    });
  } catch (e) {
    console.warn("Log error", e);
  }
};

export default client;
