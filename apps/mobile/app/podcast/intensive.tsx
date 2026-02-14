import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Loader2,
} from "lucide-react-native";
import { podcastApi } from "@nce/api";
import { useWordExplainer } from "../../src/hooks/useWordExplainer";
import { DictionaryModal } from "../../src/components/DictionaryModal";
import { proficiencyApi } from "@nce/api";
import {
  usePodcastStore,
  selectCurrentEpisode,
  selectIsPlaying,
  selectProgress,
} from "@nce/store";
import { audioService } from "../../src/services/AudioService";

type PlayerSegment = {
  text: string;
  start_time: number;
  end_time: number;
  sentences?: string[];
};

function splitWords(text: string) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

export default function PodcastIntensiveScreen() {
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();
  const router = useRouter();
  const numericEpisodeId = Number(episodeId);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const wasPlayingBeforeInspectRef = useRef(false);

  const currentEpisode = usePodcastStore(selectCurrentEpisode);
  const isPlaying = usePodcastStore(selectIsPlaying);
  const { position: positionMillis, duration: durationMillis } =
    usePodcastStore(selectProgress);
  const isBuffering = usePodcastStore((state) => state.isBuffering);

  const {
    selectedWord,
    inspectorData,
    isInspecting,
    isExplaining,
    contextExplanation,
    currentSentenceContext,
    isPhrase,
    explainStyle,
    generatedImage,
    isGeneratingImage,
    imagePrompt,
    handleWordClick,
    closeInspector,
    changeExplainStyle,
    generateImage,
  } = useWordExplainer();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["podcast", "player", numericEpisodeId],
    queryFn: () => podcastApi.getPlayerContent(numericEpisodeId),
    enabled: Number.isFinite(numericEpisodeId) && numericEpisodeId > 0,
  });

  const { data: episodeData } = useQuery({
    queryKey: ["podcast", "episode", numericEpisodeId],
    queryFn: () => podcastApi.getEpisode(numericEpisodeId),
    enabled: Number.isFinite(numericEpisodeId) && numericEpisodeId > 0,
  });

  const segments = useMemo<PlayerSegment[]>(() => {
    if (!data?.blocks) return [];
    return data.blocks.filter(
      (block) =>
        typeof block.start_time === "number" &&
        typeof block.end_time === "number",
    );
  }, [data?.blocks]);

  useEffect(() => {
    if (!episodeData) return;

    const bootstrapPlayback = async () => {
      const startPosition = Number(data?.metadata?.current_position || 0);

      if (!currentEpisode || currentEpisode.id !== episodeData.id) {
        await audioService.playEpisode(episodeData, startPosition);
      }
    };

    bootstrapPlayback().catch((e) => {
      console.error("[Intensive] Failed to bootstrap playback", e);
    });
  }, [episodeData, data?.metadata?.current_position, currentEpisode?.id]);

  useEffect(() => {
    if (selectedWord) {
      if (isPlaying) {
        wasPlayingBeforeInspectRef.current = true;
        void audioService.pause();
      } else {
        wasPlayingBeforeInspectRef.current = false;
      }
      return;
    }

    if (!selectedWord && wasPlayingBeforeInspectRef.current) {
      wasPlayingBeforeInspectRef.current = false;
      void audioService.resume();
    }
  }, [selectedWord, isPlaying]);

  const currentTime = positionMillis / 1000;
  const activeSegmentIndex = useMemo(
    () =>
      segments.findIndex(
        (seg) =>
          currentTime >= seg.start_time && currentTime <= seg.end_time + 0.2,
      ),
    [segments, currentTime],
  );

  const togglePlay = async () => {
    if (isPlaying) {
      await audioService.pause();
    } else {
      await audioService.resume();
    }
  };

  const seekTo = async (seconds: number) => {
    const nextMillis = Math.max(0, Math.min(seconds * 1000, durationMillis));
    await audioService.seek(nextMillis);
  };

  const progress =
    durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  const runTranscription = async () => {
    if (!numericEpisodeId) return;
    setIsTranscribing(true);
    try {
      await podcastApi.transcribeEpisode(numericEpisodeId, true);
      Alert.alert(
        "Transcription Started",
        "AI transcription has started in background. Please refresh in a moment.",
      );
      setTimeout(() => {
        void refetch();
      }, 1500);
    } catch (e: any) {
      Alert.alert("Failed", e?.message || "Could not start transcription.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const onMarkAsKnown = useCallback(
    async (word: string) => {
      try {
        await proficiencyApi.updateWordStatus(word.toLowerCase(), "mastered");
        closeInspector();
      } catch {
        Alert.alert("Error", "Failed to mark word as known");
      }
    },
    [closeInspector],
  );

  const onAddToReview = useCallback(
    async (word: string) => {
      try {
        await proficiencyApi.updateWordStatus(word.toLowerCase(), "learning");
        closeInspector();
      } catch {
        Alert.alert("Error", "Failed to add word to review");
      }
    },
    [closeInspector],
  );

  if (!Number.isFinite(numericEpisodeId) || numericEpisodeId <= 0) {
    return null;
  }

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-accent-danger font-bold mb-2">
            Transcription not ready
          </Text>
          <Text className="text-text-muted text-center text-sm mb-6">
            Generate transcript first, then reopen Intensive Listening.
          </Text>
          <TouchableOpacity
            onPress={runTranscription}
            disabled={isTranscribing}
            className="bg-bg-surface border border-border-default px-4 py-3 rounded-xl"
          >
            <Text className="text-text-primary font-bold text-xs">
              {isTranscribing ? "STARTING..." : "START TRANSCRIPTION"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#E0E0E0" />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-text-primary font-bold" numberOfLines={1}>
            {data?.title || "Intensive Listening"}
          </Text>
          <Text className="text-text-muted text-[10px] uppercase">
            Intensive Listening
          </Text>
        </View>
        <TouchableOpacity
          onPress={runTranscription}
          disabled={isTranscribing}
          className="px-3 py-2 rounded-lg border border-border-default"
        >
          {isTranscribing ? (
            <Loader2 size={14} color="#A0A0A0" />
          ) : (
            <Text className="text-text-secondary text-[10px] font-bold">
              TRANSCRIBE
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="px-4 py-4 border-b border-border-default">
        <View className="h-1 bg-bg-elevated rounded-full overflow-hidden mb-2">
          <View
            className="h-full bg-accent-primary"
            style={{ width: `${progress}%` }}
          />
        </View>
        <View className="flex-row justify-between mb-4">
          <Text className="text-text-muted text-xs">
            {Math.floor(currentTime)}s
          </Text>
          <Text className="text-text-muted text-xs">
            {Math.floor(durationMillis / 1000)}s
          </Text>
        </View>
        <View className="flex-row items-center justify-center">
          <TouchableOpacity
            onPress={() => seekTo(currentTime - 10)}
            className="p-2"
          >
            <SkipBack size={24} color="#E0E0E0" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={togglePlay}
            className="mx-6 w-14 h-14 rounded-full bg-accent-primary items-center justify-center"
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color="#050505" />
            ) : isPlaying ? (
              <Pause size={28} color="#050505" />
            ) : (
              <Play size={28} color="#050505" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => seekTo(currentTime + 10)}
            className="p-2"
          >
            <SkipForward size={24} color="#E0E0E0" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {segments.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-text-muted">No transcript segments yet.</Text>
            <TouchableOpacity
              onPress={runTranscription}
              disabled={isTranscribing}
              className="mt-3 px-4 py-2 rounded-lg border border-border-default bg-bg-surface"
            >
              <Text className="text-text-secondary text-xs font-bold">
                {isTranscribing ? "STARTING..." : "GENERATE TRANSCRIPT"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          segments.map((segment, index) => (
            <TouchableOpacity
              key={`${segment.start_time}-${index}`}
              className={`p-3 rounded-lg mb-2 border ${
                index === activeSegmentIndex
                  ? "bg-accent-primary/10 border-accent-primary/30"
                  : "bg-bg-surface border-border-default"
              }`}
              onPress={() => seekTo(segment.start_time)}
            >
              <Text className="text-text-muted text-[10px] mb-1">
                {Math.floor(segment.start_time)}s
              </Text>
              <Text>
                {splitWords(segment.text || "").map((token, tokenIndex) => {
                  const pureWord = token.replace(/[^a-zA-Z'-]/g, "");
                  const isWord = pureWord.length > 1;
                  if (!isWord) {
                    return (
                      <Text
                        key={`sep-${tokenIndex}`}
                        className="text-text-secondary"
                      >
                        {token}
                      </Text>
                    );
                  }
                  return (
                    <Text
                      key={`w-${tokenIndex}`}
                      onPress={() =>
                        handleWordClick(
                          pureWord.toLowerCase(),
                          segment.text || "",
                        )
                      }
                      className={
                        index === activeSegmentIndex
                          ? "text-accent-primary underline"
                          : "text-text-secondary underline"
                      }
                    >
                      {token}
                    </Text>
                  );
                })}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <DictionaryModal
        visible={!!selectedWord}
        onClose={closeInspector}
        inspectorData={inspectorData}
        contextExplanation={contextExplanation}
        isInspecting={isInspecting}
        isExplaining={isExplaining}
        selectedWord={selectedWord}
        isPhrase={isPhrase}
        explainStyle={explainStyle}
        generatedImage={generatedImage}
        isGeneratingImage={isGeneratingImage}
        imagePrompt={imagePrompt}
        onExplainStyle={changeExplainStyle}
        onGenerateImage={generateImage}
        onMarkAsKnown={onMarkAsKnown}
        onAddToReview={onAddToReview}
        onPlayAudio={() => {}}
        currentSentenceContext={currentSentenceContext}
      />
    </SafeAreaView>
  );
}
