import axios from 'axios';
import { getAccessToken, refreshAccessToken, clearTokens, isTokenExpired } from './auth';

const client = axios.create({
  baseURL: '', // Vite proxy handles /api prefix
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for refresh token
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

// Subscribe to token refresh
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// Notify all subscribers when token is refreshed
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Handle refresh failure
const onRefreshFailed = () => {
  refreshSubscribers = [];
  clearTokens();
  // Dispatch custom event to notify app of auth failure
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
};

// Add request interceptor to inject token and check expiry
client.interceptors.request.use(
  async (config) => {
    let token = getAccessToken();
    
    // Proactively refresh if token is about to expire (within 60s buffer)
    if (token && isTokenExpired() && !isRefreshing) {
      isRefreshing = true;
      try {
        await refreshAccessToken();
        token = getAccessToken();
      } catch {
        // Refresh failed, will be handled by response interceptor
      } finally {
        isRefreshing = false;
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle 401 and auto-refresh
client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          await refreshAccessToken();
          const newToken = getAccessToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);
        } catch {
          isRefreshing = false;
          onRefreshFailed();
          return Promise.reject(new Error('Session expired. Please log in again.'));
        }
      } else {
        // Another refresh is in progress, wait for it
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(client(originalRequest));
            } else {
              reject(new Error('Session expired. Please log in again.'));
            }
          });
        });
      }
    }
    
    const msg = error.response?.data?.detail || error.message || 'Request failed';
    return Promise.reject(new Error(typeof msg === 'object' ? JSON.stringify(msg) : msg));
  }
);

// Dictionary
export const lookupDictionary = async (word) => client.post('/api/dictionary/lookup', { word });

export const explainInContext = async (word, sentence) => client.post('/api/dictionary/context', { word, sentence });

export default client;
