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
import { View, ActivityIndicator, AppState } from "react-native";
import { useAuthStore, useCurrentUser, useSettingsStore } from "@nce/store";
import {
  initializePlatformAdapters,
  setApiBaseUrl,
} from "../src/lib/platform-init";
import PlayerBar from "../src/components/PlayerBar";
import { audioService } from "../src/services/AudioService";
import { downloadService } from "../src/services/DownloadService";
import { notificationService } from "../src/services/NotificationService";

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
  const notificationsEnabled = useSettingsStore(
    (state) => state.notificationsEnabled,
  );
  const reminderTime = useSettingsStore((state) => state.reminderTime);
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

  // Init Auth & Services & AppState Listener
  useEffect(() => {
    initializeAuth();
    audioService.init();
    downloadService.init();

    // Sync podcast progress when app goes to background
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        audioService.checkpoint();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    void notificationService.syncDailyReminder(
      reminderTime,
      notificationsEnabled,
    );
  }, [reminderTime, notificationsEnabled]);

  // Auth Guard
  useEffect(() => {
    if (!isInitialized || !fontsLoaded) return;

    const inAuthGroup = segments[0] === "auth";

    if (!user && !inAuthGroup) {
      // Redirect to the login screen
      router.replace("/auth/login");
    } else if (user && inAuthGroup) {
      // Redirect to the home screen
      router.replace("/nav");
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
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="nav" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="voice" />
        <Stack.Screen name="voice-lab" />
        <Stack.Screen name="reading/index" />
        <Stack.Screen name="sentence-study" />
        <Stack.Screen name="performance" />
        <Stack.Screen name="review-queue" />
        <Stack.Screen name="podcast/index" />
        <Stack.Screen name="podcast/opml" />
        <Stack.Screen name="podcast/playlists" />
        <Stack.Screen name="podcast/playlist/[playlistId]" />
        <Stack.Screen name="audiobook/index" />
        <Stack.Screen name="weak-points" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/register" />
        <Stack.Screen name="reading/[id]" />
        <Stack.Screen name="study/[id]" />
        <Stack.Screen name="books" />
        <Stack.Screen name="books/[filename]" />
        <Stack.Screen name="audiobook/[bookId]" />
        <Stack.Screen name="podcast/intensive" />
        <Stack.Screen name="player/[sourceType]/[contentId]" />
      </Stack>
      <PlayerBar />
    </View>
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
