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

// Dictionary
export const lookupDictionary = async (word) => client.post('/api/dictionary/lookup', { word });

export const explainInContext = async (word, sentence) => client.post('/api/dictionary/context', { word, sentence });

// Stats & Logging
export const fetchStats = async () => client.get('/api/stats');

let lastLogTime = Date.now();
export const logAttempt = async (type, topic, tense, isPass, details) => {
  const now = Date.now();
  let duration = Math.round((now - lastLogTime) / 1000);
  if (details && typeof details.duration_seconds === 'number') {
      duration = details.duration_seconds;
  } else {
      if (duration > 300) duration = 60;
      if (duration < 0) duration = 0;
  }
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

