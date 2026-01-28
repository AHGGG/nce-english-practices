/**
 * Platform Adapter Initialization for React Native
 *
 * This file sets up the platform-specific adapters for shared hooks.
 * Import this early in your app entry point (_layout.tsx).
 */

import { AppState, AppStateStatus } from "react-native";
import { setPlatformAdapter } from "@nce/shared";
import { authService } from "@nce/api";
import { setStorageAdapter } from "@nce/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/**
 * Initialize all platform adapters
 */
export function initializePlatformAdapters() {
  // 1. Set storage adapter for auth tokens and store persistence
  const asyncStorageAdapter = {
    getItem: async (key: string) => AsyncStorage.getItem(key),
    setItem: async (key: string, value: string) =>
      AsyncStorage.setItem(key, value),
    removeItem: async (key: string) => AsyncStorage.removeItem(key),
  };

  authService.setStorage(asyncStorageAdapter);
  setStorageAdapter(asyncStorageAdapter);

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

  // 3. Auto-detect and set API URL
  const url = detectApiUrl();
  setApiBaseUrl(url);
}

export let currentApiBaseUrl = "";

export function getApiBaseUrl() {
  return currentApiBaseUrl;
}

/**
 * Set the API base URL for mobile
 */
export function setApiBaseUrl(url: string) {
  currentApiBaseUrl = url;
  authService.setBaseUrl(url);
  console.log("[Platform] API base URL set to:", url);
}

function detectApiUrl() {
  // 1. Check for manual override (uncomment to force specific IP)
  // return "http://192.168.0.100:8000";

  // 2. Use Expo's auto-detected host
  if (Constants.expoConfig?.hostUri) {
    const ip = Constants.expoConfig.hostUri.split(":")[0];
    const url = `http://${ip}:8000`;
    console.log(
      `[Platform] Auto-detected host: ${url} (from ${Constants.expoConfig.hostUri})`,
    );
    return url;
  }

  // 3. Fallback for physical device on same network (hardcoded based on dev machine)
  const fallbackUrl = "http://192.168.0.100:8000";
  console.log(`[Platform] Using fallback URL: ${fallbackUrl}`);
  return fallbackUrl;
}
