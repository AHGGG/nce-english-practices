// apps/mobile/src/services/auth-init.ts
import { authService } from "@nce/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export const initAuth = () => {
  // Configure Auth Service for Mobile
  const asyncStorageAdapter = {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
  };

  authService.setStorage(asyncStorageAdapter);

  // Determine Backend URL (Dev helper)
  const getBaseUrl = () => {
    // Use explicit env var if available, otherwise guess based on Expo host
    if (Constants.expoConfig?.hostUri) {
      const ip = Constants.expoConfig.hostUri.split(":")[0];
      return `http://${ip}:8000`;
    }
    return "http://localhost:8000";
  };

  const BASE_URL = getBaseUrl();
  console.log("Mobile API Base URL:", BASE_URL);
  authService.setBaseUrl(BASE_URL);
};
