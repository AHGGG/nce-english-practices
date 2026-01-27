/**
 * Auth Store Types
 */

export interface User {
  id: string;
  email: string;
  username: string | null;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  // State
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    username?: string,
  ) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;

  // Internal
  _initialize: () => Promise<void>;
}
