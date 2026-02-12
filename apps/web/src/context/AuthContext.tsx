/**
 * Authentication Context - Provides user authentication state
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import {
  getCurrentUser,
  logout as apiLogout,
  login as apiLogin,
} from "../api/auth";

interface AuthUser {
  id?: number | string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return "Authentication failed";
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await getCurrentUser();
        setUser(userData as AuthUser | null);
      } catch (err: unknown) {
        console.error("Auth check failed:", err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  // Listen for session expiration events from axios client
  useEffect(() => {
    const handleSessionExpired = () => {
      console.warn("Session expired, logging out...");
      setUser(null);
      setError("Your session has expired. Please log in again.");
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setError(null);
      try {
        await apiLogin(email, password);
        const userData = await getCurrentUser();
        setUser(userData as AuthUser | null);
      } catch (err: unknown) {
        setError(getErrorMessage(err));
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
