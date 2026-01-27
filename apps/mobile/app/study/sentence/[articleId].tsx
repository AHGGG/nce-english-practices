import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Repeat,
} from "lucide-react-native";
import { Audio } from "expo-av";
import {
  useArticleDetail,
  extractSentencesFromBlocks,
} from "../../../src/modules/study/useStudyData";
import { sentenceStudyApi } from "@nce/api";
import { useWordExplainer } from "@nce/shared";
import { DictionaryModal } from "../../../src/components/DictionaryModal";
import { authService } from "@nce/api";

const API_BASE_URL = "http://localhost:8000"; // TODO: Make configurable

export default function SentenceStudyScreen() {
  const { articleId } = useLocalSearchParams();
  const router = useRouter();
  const { article, isLoading, error } = useArticleDetail(articleId as string);

  // State
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Dictionary
  const {
    handleWordClick,
    inspectorData,
    contextExplanation,
    isInspecting,
    isExplaining,
  } = useWordExplainer();
  const [modalVisible, setModalVisible] = useState(false);

  // Initialize sentences
  useEffect(() => {
    if (article) {
      const flat = extractSentencesFromBlocks(article.blocks);
      setSentences(flat);
    }
  }, [article]);

  // Cleanup sound
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay && sentences.length > 0) {
      playAudio();
    }
    // Reset start time for tracking
    startTimeRef.current = Date.now();
  }, [currentIndex, autoPlay]);

  // Play Audio Logic
  const playAudio = async () => {
    if (!sentences[currentIndex]) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      setIsPlaying(true);
      const token = await authService.getAccessToken();
      const uri = `${API_BASE_URL}/api/voice/tts?text=${encodeURIComponent(sentences[currentIndex])}`;

      const { sound: newSound } = await Audio.Sound.createAsync(
        {
          uri,
          headers: { Authorization: `Bearer ${token}` },
        },
        { shouldPlay: true },
      );

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      await newSound.playAsync();
    } catch (e) {
      console.error("Audio playback failed", e);
      setIsPlaying(false);
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };

  const handleNext = async () => {
    // Record progress before moving
    if (article) {
      const studyTime = Date.now() - startTimeRef.current;
      sentenceStudyApi
        .recordLearning({
          source_id: String(article.id), // Using article.id as source_id
          sentence_index: currentIndex,
          result: "good", // Implicit "pass"
          study_time_ms: studyTime,
        })
        .catch((e) => console.error("Failed to record progress", e));
    }

    if (currentIndex < sentences.length - 1) {
      await stopAudio();
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = async () => {
    if (currentIndex > 0) {
      await stopAudio();
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Word Click Handler
  const onWordPress = (word: string) => {
    handleWordClick(word, sentences[currentIndex]);
    setModalVisible(true);
  };

  // Modal trigger
  useEffect(() => {
    if (inspectorData || isInspecting) {
      setModalVisible(true);
    }
  }, [inspectorData, isInspecting]);

  if (isLoading || sentences.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator size="large" color="#00FF94" />
        <Text className="text-text-muted mt-4 font-mono text-xs uppercase">
          Loading Drill...
        </Text>
      </View>
    );
  }

  const currentText = sentences[currentIndex];
  const progress = Math.round(((currentIndex + 1) / sentences.length) * 100);

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="h-14 border-b border-border flex-row items-center px-4 bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ChevronLeft color="#888888" size={24} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text
            className="text-text-primary font-bold text-base font-serif"
            numberOfLines={1}
          >
            Deep Study
          </Text>
          <Text className="text-text-muted text-[10px] font-mono uppercase">
            {article?.title}
          </Text>
        </View>

        {/* Auto Play Toggle */}
        <TouchableOpacity
          onPress={() => setAutoPlay(!autoPlay)}
          className={`mr-3 p-2 rounded border ${autoPlay ? "border-accent-primary bg-accent-primary/10" : "border-border"}`}
        >
          <Repeat size={16} color={autoPlay ? "#00FF94" : "#666"} />
        </TouchableOpacity>

        <View className="bg-bg-elevated px-2 py-1 rounded border border-border">
          <Text className="text-accent-primary font-mono text-xs font-bold">
            {currentIndex + 1} / {sentences.length}
          </Text>
        </View>
      </View>

      {/* Main Content Card */}
      <View className="flex-1 justify-center px-6">
        <View className="bg-bg-surface p-8 rounded-2xl border border-border shadow-2xl min-h-[300px] justify-center items-center relative">
          {/* Progress Bar Top */}
          <View className="absolute top-0 left-0 right-0 h-1 bg-bg-elevated rounded-t-2xl overflow-hidden">
            <View
              className="h-full bg-accent-primary"
              style={{ width: `${progress}%` }}
            />
          </View>

          {/* Text Renderer */}
          <Text className="text-2xl text-text-primary font-serif leading-10 text-center">
            {currentText.split(" ").map((word, i) => (
              <Text
                key={i}
                onPress={() => onWordPress(word.replace(/[.,!?;:"'()]/g, ""))}
                className="active:text-accent-primary active:bg-accent-primary/10"
              >
                {word}{" "}
              </Text>
            ))}
          </Text>
        </View>
      </View>

      {/* Controls Area */}
      <View className="h-32 px-8 pb-8 flex-row items-center justify-between">
        {/* Prev */}
        <TouchableOpacity
          onPress={handlePrev}
          disabled={currentIndex === 0}
          className={`p-4 rounded-full border ${currentIndex === 0 ? "border-border bg-bg-surface opacity-50" : "border-border bg-bg-surface"}`}
        >
          <SkipBack color={currentIndex === 0 ? "#666" : "#E0E0E0"} size={24} />
        </TouchableOpacity>

        {/* Play/Pause (Center Big) */}
        <TouchableOpacity
          onPress={togglePlayback}
          className="w-20 h-20 rounded-full bg-accent-primary items-center justify-center shadow-lg shadow-accent-primary/20"
        >
          {isPlaying ? (
            <Pause color="#000" size={32} fill="black" />
          ) : (
            <Play color="#000" size={32} fill="black" className="ml-1" />
          )}
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={currentIndex === sentences.length - 1}
          className={`p-4 rounded-full border ${currentIndex === sentences.length - 1 ? "border-border bg-bg-surface opacity-50" : "border-border bg-bg-surface"}`}
        >
          <SkipForward
            color={currentIndex === sentences.length - 1 ? "#666" : "#E0E0E0"}
            size={24}
          />
        </TouchableOpacity>
      </View>

      {/* Dictionary Modal */}
      <DictionaryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        inspectorData={inspectorData}
        contextExplanation={contextExplanation}
        isInspecting={isInspecting}
        isExplaining={isExplaining}
      />
    </SafeAreaView>
  );
}
