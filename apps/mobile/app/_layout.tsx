import { Stack, useRouter, useSegments } from "expo-router";
import "../global.css";
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
import { View, ActivityIndicator } from "react-native";
import { useAuthStore, useCurrentUser } from "@nce/store";
import {
  initializePlatformAdapters,
  setApiBaseUrl,
} from "../src/lib/platform-init";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient();

// Initialize platform adapters EARLY
initializePlatformAdapters();
// Default to localhost for now, user can change later or we can detect
// setApiBaseUrl("http://localhost:8000");

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootContent() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initializeAuth = useAuthStore((state) => state._initialize);
  const user = useCurrentUser();
  const segments = useSegments();
  const router = useRouter();

  // Load Fonts
  const [fontsLoaded] = useFonts({
    Merriweather: Merriweather_400Regular,
    "Merriweather-Bold": Merriweather_700Bold,
    "JetBrains Mono": JetBrainsMono_400Regular,
    "JetBrains Mono-Bold": JetBrainsMono_700Bold,
    Inter: Inter_400Regular,
    "Inter-Bold": Inter_700Bold,
  });

  // Init Auth
  useEffect(() => {
    initializeAuth();
  }, []);

  // Auth Guard
  useEffect(() => {
    if (!isInitialized || !fontsLoaded) return;

    const inAuthGroup = segments[0] === "auth";

    if (!user && !inAuthGroup) {
      // Redirect to the login screen
      router.replace("/auth/login");
    } else if (user && inAuthGroup) {
      // Redirect to the home screen
      router.replace("/(tabs)");
    }
  }, [user, segments, isInitialized, fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  if (!fontsLoaded || !isInitialized) {
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
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <RootContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
