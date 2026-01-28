import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNegotiationSession } from "@nce/shared";
import { Audio } from "expo-av";
import { useState, useRef, useEffect } from "react";
import {
  Volume2,
  HelpCircle,
  ArrowRight,
  SkipForward,
  Eye,
  EyeOff,
  Play,
  BookOpen,
  Languages,
} from "lucide-react-native";
import { getApiBaseUrl } from "../../src/lib/platform-init";

export default function VoiceModeScreen() {
  const [hasStarted, setHasStarted] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio Player
  const playAudio = async (text: string, lang = "en") => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      setIsPlaying(true);
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/tts?text=${encodeURIComponent(text)}`;

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (e) {
      console.error("Audio play failed", e);
      setIsPlaying(false);
    }
  };

  const { state, actions } = useNegotiationSession(playAudio);

  const handleStart = async () => {
    setHasStarted(true);
    await actions.start();
  };

  if (!hasStarted) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base items-center justify-center p-6">
        <View className="mb-10 items-center">
          <View className="w-24 h-24 rounded-full bg-accent-primary/10 items-center justify-center mb-6 border border-accent-primary/30">
            <Volume2 size={40} color="#00FF94" />
          </View>
          <Text className="text-3xl font-serif font-bold text-text-primary text-center">
            Voice Mode
          </Text>
          <Text className="text-text-secondary text-center mt-2 px-8">
            Interactive listening practice. Listen, ask questions, and master
            usage in context.
          </Text>
        </View>

        <TouchableOpacity
          className="bg-accent-primary px-8 py-4 rounded-full flex-row items-center"
          onPress={handleStart}
        >
          <Play size={20} color="#050505" fill="#050505" />
          <Text className="text-bg-base font-bold ml-2 text-lg">
            START SESSION
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 p-6 justify-center">
        {/* Source Badge */}
        {state.sourceWord && (
          <View className="items-center mb-6">
            <View className="bg-accent-primary/10 px-4 py-1.5 rounded-full border border-accent-primary/30">
              <Text className="text-accent-primary text-xs font-mono font-bold tracking-wider">
                📖 {state.sourceWord.toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Text Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={actions.toggleText}
          className={`p-8 rounded-3xl border-2 mb-8 min-h-[200px] justify-center items-center ${
            isPlaying
              ? "border-accent-warning/50 bg-accent-warning/5"
              : "border-border-default bg-bg-surface"
          }`}
        >
          <Text
            className={`text-2xl font-serif leading-relaxed text-center text-text-primary transition-opacity ${
              state.isTextVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {state.currentText}
          </Text>

          {!state.isTextVisible && (
            <View className="absolute inset-0 items-center justify-center">
              <View className="flex-row items-center bg-bg-base/80 px-4 py-2 rounded-full border border-border-default">
                <Eye size={16} color="#A0A0A0" />
                <Text className="text-text-muted text-xs font-mono ml-2">
                  TAP TO REVEAL
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Context Scenario */}
        {state.contextScenario &&
          state.isTextVisible &&
          state.step === "original" && (
            <View className="bg-bg-elevated p-4 rounded-xl border border-border-subtle mb-8">
              <Text className="text-text-secondary text-sm font-serif italic text-center">
                "{state.contextScenario}"
              </Text>
            </View>
          )}

        {/* Scaffolds */}
        {(state.definition || state.translation) && (
          <View className="flex-row gap-2 mb-8">
            {state.definition && (
              <View className="flex-1 bg-accent-info/5 p-3 rounded-xl border border-accent-info/20">
                <View className="flex-row items-center mb-1">
                  <BookOpen size={12} color="#00E0FF" />
                  <Text className="text-accent-info text-[10px] font-bold ml-1 uppercase">
                    Definition
                  </Text>
                </View>
                <Text className="text-text-secondary text-xs">
                  {state.definition}
                </Text>
              </View>
            )}
            {state.translation && (
              <View className="flex-1 bg-accent-danger/5 p-3 rounded-xl border border-accent-danger/20">
                <View className="flex-row items-center mb-1">
                  <Languages size={12} color="#FF0055" />
                  <Text className="text-accent-danger text-[10px] font-bold ml-1 uppercase">
                    Translation
                  </Text>
                </View>
                <Text className="text-text-secondary text-xs">
                  {state.translation}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Status */}
        <View className="items-center mb-8">
          {state.isLoading ? (
            <ActivityIndicator color="#00FF94" />
          ) : (
            <TouchableOpacity
              className={`flex-row items-center px-4 py-2 rounded-full ${isPlaying ? "bg-accent-warning/20" : "bg-bg-surface border border-border-default"}`}
              onPress={() => playAudio(state.currentText)}
            >
              <Volume2 size={16} color={isPlaying ? "#F59E0B" : "#E0E0E0"} />
              <Text
                className={`text-xs font-mono ml-2 ${isPlaying ? "text-accent-warning" : "text-text-muted"}`}
              >
                {isPlaying ? "PLAYING..." : "REPLAY AUDIO"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bottom Controls */}
      <View className="p-6 pb-8 flex-row justify-between bg-bg-surface border-t border-border-default">
        <TouchableOpacity
          className="flex-1 bg-bg-elevated py-4 rounded-2xl items-center border border-border-default mr-3"
          onPress={() => actions.interact("huh")}
          disabled={state.isLoading}
        >
          <HelpCircle size={24} color="#FF0055" />
          <Text className="text-accent-danger font-bold text-xs mt-1">
            HUH?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-bg-elevated py-4 rounded-2xl items-center border border-border-default mr-3"
          onPress={actions.skip}
          disabled={state.isLoading}
        >
          <SkipForward size={24} color="#F59E0B" />
          <Text className="text-accent-warning font-bold text-xs mt-1">
            SKIP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-accent-primary/10 py-4 rounded-2xl items-center border border-accent-primary/30"
          onPress={() => actions.interact("continue")}
          disabled={state.isLoading}
        >
          <ArrowRight size={24} color="#00FF94" />
          <Text className="text-accent-primary font-bold text-xs mt-1">
            GOT IT
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
