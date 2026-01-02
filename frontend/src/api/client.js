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

export default client;
