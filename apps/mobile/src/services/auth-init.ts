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
    // 1. Check for manual override (uncomment to force specific IP)
    // return "http://192.168.0.100:8000";

    // 2. Use Expo's auto-detected host
    if (Constants.expoConfig?.hostUri) {
      const ip = Constants.expoConfig.hostUri.split(":")[0];
      const url = `http://${ip}:8000`;
      console.log(
        `[AuthInit] Auto-detected host: ${url} (from ${Constants.expoConfig.hostUri})`,
      );
      return url;
    }

    // 3. Fallback for physical device on same network (hardcoded based on dev machine)
    // If you are using Emulator, use http://10.0.2.2:8000
    // If you are on a real device, use your PC's IP address (e.g. 192.168.0.100)
    const fallbackUrl = "http://192.168.0.100:8000";
    console.log(`[AuthInit] Using fallback URL: ${fallbackUrl}`);
    return fallbackUrl;
  };

  const BASE_URL = getBaseUrl();
  console.log("Mobile API Base URL:", BASE_URL);
  authService.setBaseUrl(BASE_URL);
};
