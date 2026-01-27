/**
 * Platform Adapter Initialization for React Native
 *
 * This file sets up the platform-specific adapters for shared hooks.
 * Import this early in your app entry point (_layout.tsx).
 */

import { AppState, AppStateStatus } from "react-native";
import { setPlatformAdapter } from "@nce/shared";
import { authService } from "@nce/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Initialize all platform adapters
 */
export function initializePlatformAdapters() {
  // 1. Set storage adapter for auth tokens
  const asyncStorageAdapter = {
    getItem: async (key: string) => AsyncStorage.getItem(key),
    setItem: async (key: string, value: string) =>
      AsyncStorage.setItem(key, value),
    removeItem: async (key: string) => AsyncStorage.removeItem(key),
  };

  authService.setStorage(asyncStorageAdapter);

  // 2. Set platform adapter for shared hooks
  setPlatformAdapter({
    visibility: {
      onVisibilityChange: (callback) => {
        const subscription = AppState.addEventListener(
          "change",
          (nextAppState: AppStateStatus) => {
            callback(nextAppState === "active");
          },
        );
        return () => subscription.remove();
      },
    },
  });

  console.log("[Platform] Adapters initialized for React Native");
}

/**
 * Set the API base URL for mobile
 * Call this after determining the server address
 */
export function setApiBaseUrl(url: string) {
  authService.setBaseUrl(url);
  console.log("[Platform] API base URL set to:", url);
}
