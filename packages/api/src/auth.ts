import { TokenStorage, localStorageAdapter } from "./storage";

const API_BASE = "/api/auth";

/**
 * User profile returned from API
 */
export interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
}
const ACCESS_TOKEN_KEY = "access_token";
const TOKEN_EXPIRY_KEY = "token_expiry";

export class AuthService {
  private storage: TokenStorage;
  private baseUrl: string = "";

  constructor(storage: TokenStorage = localStorageAdapter) {
    this.storage = storage;
  }

  /**
   * Set the storage adapter (e.g. for React Native)
   */
  setStorage(storage: TokenStorage) {
    this.storage = storage;
  }

  /**
   * Set the base URL for API requests (e.g. for Mobile)
   * Should not end with slash
   */
  setBaseUrl(url: string) {
    this.baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
  }

  private getFullUrl(path: string): string {
    if (path.startsWith("http")) return path;
    return `${this.baseUrl}${path}`;
  }

  /**
   * Check if registration is allowed on this server
   */
  async checkRegistrationStatus() {
    try {
      const response = await fetch(
        this.getFullUrl(`${API_BASE}/registration-status`),
      );
      if (!response.ok) return { registration_allowed: true };
      return await response.json();
    } catch {
      return { registration_allowed: true };
    }
  }

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    return await this.storage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Store access token and expiry
   */
  async setAccessToken(token: string, expiresIn: number) {
    await this.storage.setItem(ACCESS_TOKEN_KEY, token);
    const expiry = Date.now() + expiresIn * 1000;
    await this.storage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  }

  /**
   * Clear stored tokens
   */
  async clearTokens() {
    await this.storage.removeItem(ACCESS_TOKEN_KEY);
    await this.storage.removeItem(TOKEN_EXPIRY_KEY);
  }

  /**
   * Check if token is expired or about to expire (within 60s)
   */
  async isTokenExpired(): Promise<boolean> {
    const expiry = await this.storage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() >= parseInt(expiry) - 60000; // 60s buffer
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    username: string | null = null,
  ) {
    const response = await fetch(this.getFullUrl(`${API_BASE}/register`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Registration failed");
    }

    return await response.json();
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    const response = await fetch(this.getFullUrl(`${API_BASE}/login`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Include cookies for refresh token
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();
    await this.setAccessToken(data.access_token, data.expires_in);
    return data;
  }

  /**
   * Refresh the access token
   */
  async refreshAccessToken() {
    const response = await fetch(this.getFullUrl(`${API_BASE}/refresh`), {
      method: "POST",
      credentials: "include", // Include cookies for refresh token
    });

    if (!response.ok) {
      await this.clearTokens();
      throw new Error("Session expired");
    }

    const data = await response.json();
    await this.setAccessToken(data.access_token, data.expires_in);
    return data;
  }

  /**
   * Logout
   */
  async logout() {
    try {
      await fetch(this.getFullUrl(`${API_BASE}/logout`), {
        method: "POST",
        credentials: "include",
      });
    } finally {
      await this.clearTokens();
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    let token = await this.getAccessToken();

    // 1. Proactive check
    if (!token) return null;

    // 2. Proactive Refresh
    if (await this.isTokenExpired()) {
      try {
        await this.refreshAccessToken();
        token = await this.getAccessToken();
      } catch {
        return null;
      }
    }

    // 3. Make the request
    const response = await fetch(this.getFullUrl(`${API_BASE}/me`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // 4. Reactive Retry
        try {
          await this.refreshAccessToken();
          return await this.getCurrentUser(); // Recurse once
        } catch {
          return null;
        }
      }
      return null;
    }

    return await response.json();
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string) {
    let token = await this.getAccessToken();
    const response = await fetch(
      this.getFullUrl(`${API_BASE}/change-password`),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Password change failed");
    }

    return await response.json();
  }

  /**
   * Fetch with automatic token refresh
   */
  async authFetch(url: string, options: RequestInit = {}) {
    let token = await this.getAccessToken();

    // Try to refresh if expired
    if ((await this.isTokenExpired()) && token) {
      try {
        await this.refreshAccessToken();
        token = await this.getAccessToken();
      } catch {
        token = null;
      }
    }

    const headers: HeadersInit = { ...(options.headers || {}) };
    if (token) {
      (headers as any).Authorization = `Bearer ${token}`;
    }

    const fullUrl = this.getFullUrl(url);
    const response = await fetch(fullUrl, { ...options, headers });

    // If 401 and we have a token, try refresh once
    if (response.status === 401 && token) {
      try {
        await this.refreshAccessToken();
        token = await this.getAccessToken();
        (headers as any).Authorization = `Bearer ${token}`;
        return await fetch(fullUrl, { ...options, headers });
      } catch {
        // Refresh failed
      }
    }

    return response;
  }
}

// Export a singleton for default web usage
export const authService = new AuthService();
export const authFetch = authService.authFetch.bind(authService);
