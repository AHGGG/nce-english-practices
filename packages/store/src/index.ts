/**
 * @nce/store - Cross-platform state management
 *
 * This package provides Zustand-based global state management
 * that works identically on Web and React Native.
 *
 * Usage:
 * ```tsx
 * import { useAuthStore, setStorageAdapter } from '@nce/store';
 *
 * // For React Native, set AsyncStorage early in app init
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * setStorageAdapter({
 *   getItem: (key) => AsyncStorage.getItem(key),
 *   setItem: (key, value) => AsyncStorage.setItem(key, value),
 *   removeItem: (key) => AsyncStorage.removeItem(key),
 * });
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
