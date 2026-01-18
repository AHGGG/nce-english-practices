/**
 * Authentication API utilities
 */

const API_BASE = '/api/auth';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/**
 * Check if registration is allowed on this server
 */
export async function checkRegistrationStatus() {
  try {
    const response = await fetch(`${API_BASE}/registration-status`);
    if (!response.ok) return { registration_allowed: true }; // Default to allowed on error
    return response.json();
  } catch {
    return { registration_allowed: true };
  }
}

/**
 * Get stored access token
 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Store access token and expiry
 */
export function setAccessToken(token, expiresIn) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  const expiry = Date.now() + expiresIn * 1000;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
}

/**
 * Clear stored tokens
 */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Check if token is expired or about to expire (within 60s)
 */
export function isTokenExpired() {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() >= parseInt(expiry) - 60000; // 60s buffer
}

/**
 * Register a new user
 */
export async function register(email, password, username = null) {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Registration failed');
  }

  return response.json();
}

/**
 * Login with email and password
 */
export async function login(email, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include cookies for refresh token
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }

  const data = await response.json();
  setAccessToken(data.access_token, data.expires_in);
  return data;
}

/**
 * Refresh the access token
 */
export async function refreshAccessToken() {
  const response = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    credentials: 'include', // Include cookies for refresh token
  });

  if (!response.ok) {
    clearTokens();
    throw new Error('Session expired');
  }

  const data = await response.json();
  setAccessToken(data.access_token, data.expires_in);
  return data;
}

/**
 * Logout
 */
export async function logout() {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    clearTokens();
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser() {
  let token = getAccessToken();
  
  // 1. Proactive check: If token is missing, we can't do anything (unless we try cookie-only refresh? No, design requires token first)
  if (!token) return null;

  // 2. Proactive Refresh: If token is expired, try to refresh BEFORE hitting the API
  if (isTokenExpired()) {
    try {
      await refreshAccessToken();
      token = getAccessToken(); // Update local var with new token
    } catch {
      // Refresh failed (cookie expired?), return null to force login
      return null;
    }
  }

  // 3. Make the request
  const response = await fetch(`${API_BASE}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // 4. Reactive Retry: Token might have been revoked server-side or expired just now
      try {
        await refreshAccessToken();
        // Recurse once with new token
        return getCurrentUser();
      } catch {
        return null;
      }
    }
    return null;
  }

  return response.json();
}

/**
 * Change password
 */
export async function changePassword(currentPassword, newPassword) {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Password change failed');
  }

  return response.json();
}

/**
 * Fetch with automatic token refresh
 */
export async function authFetch(url, options = {}) {
  let token = getAccessToken();

  // Try to refresh if expired
  if (isTokenExpired() && token) {
    try {
      await refreshAccessToken();
      token = getAccessToken();
    } catch {
      // Refresh failed, continue without token
      token = null;
    }
  }

  const headers = { ...options.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  // If 401 and we have a token, try refresh once
  if (response.status === 401 && token) {
    try {
      await refreshAccessToken();
      token = getAccessToken();
      headers.Authorization = `Bearer ${token}`;
      return fetch(url, { ...options, headers });
    } catch {
      // Refresh failed
    }
  }

  return response;
}
