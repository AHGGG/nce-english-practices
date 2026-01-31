/**
 * @nce/store - Cross-platform state management
 *
 * This package provides Zustand-based global state management
 * that works identically on Web and React Native.
 *
 * Usage:
 * ```tsx
 * import { useAuthStore, setStorageAdapter, rehydratePersistedStores } from '@nce/store';
 *
 * // For React Native, set AsyncStorage early in app init
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * setStorageAdapter({
 *   getItem: (key) => AsyncStorage.getItem(key),
 *   setItem: (key, value) => AsyncStorage.setItem(key, value),
 *   removeItem: (key) => AsyncStorage.removeItem(key),
 * });
 * // Then trigger re-hydration so stores load from the correct adapter
 * rehydratePersistedStores();
 *
 * // Then use stores normally
 * const { user, login } = useAuthStore();
 * ```
 */

// Storage adapter
export {
  setStorageAdapter,
  getStorageAdapter,
  zustandStorage,
} from "./lib/storage";

// Auth module
export * from "./modules/auth";

// Podcast module
export * from "./modules/podcast";

// Settings module
export * from "./modules/settings";

// Re-hydrate all persisted stores after storage adapter is swapped.
// In React Native, stores are imported (and initial hydration runs with
// the default localStorage adapter which fails silently) before
// setStorageAdapter() can configure AsyncStorage. Calling this function
// after setStorageAdapter() forces all stores to read from the real adapter.
export { rehydratePersistedStores } from "./lib/rehydrate";
