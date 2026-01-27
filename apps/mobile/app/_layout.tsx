// apps/mobile/app/_layout.tsx
import { Stack } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import "../global.css";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Merriweather_400Regular,
  Merriweather_700Bold,
} from "@expo-google-fonts/merriweather";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from "@expo-google-fonts/jetbrains-mono";
import { Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// Initialize platform adapters EARLY (before any hooks are called)
import {
  initializePlatformAdapters,
  setApiBaseUrl,
} from "../src/lib/platform-init";

// Run initialization immediately on module load
initializePlatformAdapters();
setApiBaseUrl("http://localhost:8000"); // TODO: Make configurable

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootContent() {
  const { isLoading: authLoading } = useAuth();

  // Load Fonts
  const [fontsLoaded] = useFonts({
    Merriweather: Merriweather_400Regular,
    "Merriweather-Bold": Merriweather_700Bold,
    "JetBrains Mono": JetBrainsMono_400Regular,
    "JetBrains Mono-Bold": JetBrainsMono_700Bold,
    Inter: Inter_400Regular,
    "Inter-Bold": Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  if (!fontsLoaded || authLoading) {
    // While loading, we can return null (splash screen is visible)
    // or a custom loading view if hideAsync hasn't been called yet.
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator size="large" color="#00FF94" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth/login" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
