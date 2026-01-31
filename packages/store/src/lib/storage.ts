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
 * Uses the configured TokenStorage adapter
 */
export const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await storageAdapter.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await storageAdapter.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await storageAdapter.removeItem(name);
  },
};
