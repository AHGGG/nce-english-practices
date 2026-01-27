/**
 * Auth Store - Convenience Hooks
 *
 * These hooks provide commonly used selectors for auth state.
 */

import {
  useAuthStore,
  selectUser,
  selectIsLoggedIn,
  selectIsAdmin,
} from "./store";

/**
 * Get current user
 */
export const useCurrentUser = () => useAuthStore(selectUser);

/**
 * Check if user is logged in
 */
export const useIsLoggedIn = () => useAuthStore(selectIsLoggedIn);

/**
 * Check if user is admin
 */
export const useIsAdmin = () => useAuthStore(selectIsAdmin);

/**
 * Get auth loading state
 */
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);

/**
 * Get auth error
 */
export const useAuthError = () => useAuthStore((state) => state.error);

/**
 * Get auth actions only (for components that don't need to re-render on state changes)
 */
export const useAuthActions = () =>
  useAuthStore((state) => ({
    login: state.login,
    logout: state.logout,
    register: state.register,
    refreshUser: state.refreshUser,
    clearError: state.clearError,
  }));
