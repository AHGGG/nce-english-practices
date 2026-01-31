/**
 * Storage Adapter for Zustand Persist Middleware
 * Works with both Web (localStorage) and React Native (AsyncStorage)
 */

import { StateStorage } from "zustand/middleware";
import { TokenStorage, localStorageAdapter } from "@nce/api";

let storageAdapter: TokenStorage = localStorageAdapter;

/**
 * Set the storage adapter for cross-platform compatibility
 * Call this early in app initialization for React Native
 */
export function setStorageAdapter(adapter: TokenStorage) {
  storageAdapter = adapter;
}

/**
 * Get the current storage adapter
 */
export function getStorageAdapter(): TokenStorage {
  return storageAdapter;
}

/**
 * Zustand-compatible StateStorage implementation
 * Uses the configured TokenStorage adapter.
 *
 * Wraps calls in try/catch to handle the case where the adapter
 * hasn't been swapped yet (e.g., React Native before AsyncStorage init,
 * where localStorageAdapter would fail because localStorage is undefined).
 */
export const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await storageAdapter.getItem(name);
    } catch {
      // localStorage doesn't exist in React Native - return null
      // until the real adapter is set via setStorageAdapter()
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await storageAdapter.setItem(name, value);
    } catch {
      // Silently fail if adapter not ready yet
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await storageAdapter.removeItem(name);
    } catch {
      // Silently fail if adapter not ready yet
    }
  },
};
