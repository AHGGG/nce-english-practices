/**
 * Auth Store - Zustand implementation
 *
 * Cross-platform authentication state management.
 * Uses @nce/api AuthService for actual API calls.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService } from "@nce/api";
import { zustandStorage } from "../../lib/storage";
import type { AuthState, User } from "./types";

/**
 * Auth Store
 *
 * Usage:
 * ```tsx
 * import { useAuthStore } from '@nce/store';
 *
 * function Component() {
 *   const { user, login, logout, isLoading } = useAuthStore();
 *
 *   if (!user) return <LoginForm onSubmit={login} />;
 *   return <Dashboard user={user} onLogout={logout} />;
 * }
 * ```
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial State
      user: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      /**
       * Login with email and password
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.login(email, password);
          const user = await authService.getCurrentUser();
          set({ user, isLoading: false, error: null });
        } catch (e: any) {
          set({
            isLoading: false,
            error: e.message || "Login failed",
            user: null,
          });
          throw e;
        }
      },

      /**
       * Logout and clear session
       */
      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
        } finally {
          set({ user: null, isLoading: false, error: null });
        }
      },

      /**
       * Register new account
       */
      register: async (email: string, password: string, username?: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.register(email, password, username || null);
          // Auto-login after registration
          await authService.login(email, password);
          const user = await authService.getCurrentUser();
          set({ user, isLoading: false, error: null });
        } catch (e: any) {
          set({
            isLoading: false,
            error: e.message || "Registration failed",
          });
          throw e;
        }
      },

      /**
       * Refresh user data from server
       */
      refreshUser: async () => {
        try {
          const user = await authService.getCurrentUser();
          set({ user });
        } catch {
          set({ user: null });
        }
      },

      /**
       * Clear error state
       */
      clearError: () => set({ error: null }),

      /**
       * Initialize auth state on app start
       * Call this once in your app entry point
       */
      _initialize: async () => {
        if (get().isInitialized) return;

        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({ user, isInitialized: true, isLoading: false });
        } catch {
          set({ user: null, isInitialized: true, isLoading: false });
        }
      },
    }),
    {
      name: "nce-auth-store",
      storage: createJSONStorage(() => zustandStorage),
      // Only persist user data, not loading states
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

// Convenience selectors
export const selectUser = (state: AuthState) => state.user;
export const selectIsLoggedIn = (state: AuthState) => !!state.user;
export const selectIsAdmin = (state: AuthState) => state.user?.role === "admin";
