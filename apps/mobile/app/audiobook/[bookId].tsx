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
import { useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react-native";
import { audiobookApi, proficiencyApi, type AudiobookBundle } from "@nce/api";
import { useCollocationLoader } from "@nce/shared";
import { useSettingsStore } from "@nce/store";
import { getApiBaseUrl } from "../../src/lib/platform-init";
import { useWordExplainer } from "../../src/hooks/useWordExplainer";
import { DictionaryModal } from "../../src/components/DictionaryModal";

type SubtitleSegment = {
  text: string;
  startTime: number;
  endTime: number;
};

function resolveAudioUrl(
  bundle: AudiobookBundle,
  bookId: string,
  track: number,
) {
  const base = getApiBaseUrl();
  const fallback = `${base}/api/content/audiobook/${encodeURIComponent(bookId)}/audio?track=${track}`;

  if (!bundle.audio_url) return fallback;
  if (
    bundle.audio_url.startsWith("http://") ||
    bundle.audio_url.startsWith("https://")
  ) {
    return bundle.audio_url;
  }
  return `${base}${bundle.audio_url}`;
}

export default function AudiobookPlayerScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [track, setTrack] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const soundRef = useRef<Audio.Sound | null>(null);

  const collocationDisplayLevel = useSettingsStore(
    (state) => state.collocationDisplayLevel,
  );
  const setCollocationDisplayLevel = useSettingsStore(
    (state) => state.setCollocationDisplayLevel,
  );

  const { getCollocations, loadCollocations, prefetchCollocations } =
    useCollocationLoader({ prefetchAhead: 8 });

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

  const { data, isLoading, error } = useQuery({
    queryKey: ["audiobook", "detail", bookId, track],
    queryFn: () => audiobookApi.getBook(bookId || "", track),
    enabled: !!bookId,
  });

  const tracks = data?.metadata?.tracks || [];

  const segments = useMemo<SubtitleSegment[]>(() => {
    if (!data?.blocks) return [];
    return data.blocks
      .filter(
        (block) =>
          block.type === "audio_segment" &&
          typeof block.start_time === "number" &&
          typeof block.end_time === "number",
      )
      .map((block) => ({
        text: block.text || block.sentences?.join(" ") || "",
        startTime: block.start_time as number,
        endTime: block.end_time as number,
      }))
      .filter((seg) => seg.text.trim().length > 0);
  }, [data?.blocks]);

  const currentTime = positionMillis / 1000;
  const activeSegmentIndex = useMemo(() => {
    return segments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime <= seg.endTime + 0.2,
    );
  }, [segments, currentTime]);

  useEffect(() => {
    if (!segments.length) return;
    const center = activeSegmentIndex >= 0 ? activeSegmentIndex : 0;

    const visible = segments
      .slice(Math.max(0, center - 2), Math.min(segments.length, center + 4))
      .map((s) => s.text)
      .filter((s) => s && s.trim().length > 0);
    const ahead = segments
      .slice(Math.max(0, center + 4), Math.min(segments.length, center + 12))
      .map((s) => s.text)
      .filter((s) => s && s.trim().length > 0);

    if (visible.length) {
      void loadCollocations(visible);
    }
    if (ahead.length) {
      prefetchCollocations(ahead);
    }
  }, [segments, activeSegmentIndex, loadCollocations, prefetchCollocations]);

  const filterByDifficulty = useCallback(
    (items: any[]) => {
      const minDifficulty =
        collocationDisplayLevel === "basic"
          ? 3
          : collocationDisplayLevel === "core"
            ? 2
            : 1;
      return (items || []).filter((item) => {
        const d = Number(item?.difficulty || 2);
        return d >= minDifficulty;
      });
    },
    [collocationDisplayLevel],
  );

  const renderSegmentText = useCallback(
    (segmentText: string, active: boolean) => {
      const words = segmentText.split(/\s+/).filter((w) => w.length > 0);
      const raw = getCollocations(segmentText) || [];
      const collocations = filterByDifficulty(raw);

      const wordCollocationMap: any[] = new Array(words.length).fill(null);
      const usedIndices = new Set<number>();

      collocations.forEach((col: any) => {
        let overlap = false;
        for (let i = col.start_word_idx; i <= col.end_word_idx; i++) {
          if (usedIndices.has(i)) {
            overlap = true;
            break;
          }
        }
        if (overlap) return;
        for (let i = col.start_word_idx; i <= col.end_word_idx; i++) {
          if (i >= 0 && i < words.length) {
            wordCollocationMap[i] = col;
            usedIndices.add(i);
          }
        }
      });

      const nodes: any[] = [];
      let i = 0;
      while (i < words.length) {
        const col = wordCollocationMap[i];
        if (col && i === col.start_word_idx) {
          const phraseTokens = words.slice(
            col.start_word_idx,
            col.end_word_idx + 1,
          );
          const phrase = phraseTokens.join(" ");
          nodes.push(
            <Text
              key={`c-${i}`}
              onPress={() =>
                handleWordClick((col.text || phrase).toLowerCase(), segmentText)
              }
              className={
                active
                  ? "text-accent-warning underline"
                  : "text-accent-warning/90 underline"
              }
            >
              {phrase}
            </Text>,
          );
          nodes.push(<Text key={`sp-${i}`}> </Text>);
          i = col.end_word_idx + 1;
          continue;
        }

        const token = words[i];
        const pureWord = token.replace(/[^a-zA-Z'-]/g, "");
        const isWord = pureWord.length > 1;
        if (isWord) {
          nodes.push(
            <Text
              key={`w-${i}`}
              onPress={() =>
                handleWordClick(pureWord.toLowerCase(), segmentText)
              }
              className={
                active
                  ? "text-accent-primary underline"
                  : "text-text-secondary underline"
              }
            >
              {token}
            </Text>,
          );
        } else {
          nodes.push(
            <Text key={`p-${i}`} className="text-text-secondary">
              {token}
            </Text>,
          );
        }
        nodes.push(<Text key={`s-${i}`}> </Text>);
        i += 1;
      }

      return nodes;
    },
    [getCollocations, filterByDifficulty, handleWordClick],
  );

  useEffect(() => {
    const setup = async () => {
      if (!data || !bookId) return;

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const audioUrl = resolveAudioUrl(data, bookId, track);

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false, progressUpdateIntervalMillis: 250 },
        (status) => {
          if (!status.isLoaded) return;
          setPositionMillis(status.positionMillis);
          setDurationMillis(status.durationMillis || 1);
          setIsPlaying(status.isPlaying);
          setIsBuffering(status.isBuffering);
        },
      );

      soundRef.current = sound;
      setPositionMillis(0);
      setDurationMillis(1);
      setIsPlaying(false);
    };

    setup().catch((e) => console.error("Failed to setup audiobook audio", e));

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [data, bookId, track]);

  const togglePlay = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  };

  const handleTranscribe = async () => {
    if (!bookId) return;
    setIsTranscribing(true);
    try {
      await audiobookApi.transcribe(bookId, track, true);
      Alert.alert(
        "Transcription Started",
        "Subtitle generation is running in background. Refresh in a moment.",
      );
      await queryClient.invalidateQueries({
        queryKey: ["audiobook", "detail", bookId, track],
      });
    } catch (e: any) {
      Alert.alert("Transcription Failed", e?.message || "Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const seekTo = async (seconds: number) => {
    if (!soundRef.current) return;
    const nextMillis = Math.max(0, Math.min(seconds * 1000, durationMillis));
    await soundRef.current.setPositionAsync(nextMillis);
  };

  const progress =
    durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

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

  if (!bookId) {
    return null;
  }

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator color="#00FF94" size="large" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base">
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-accent-danger font-bold mb-2">
            Failed to load audiobook
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-bg-surface px-4 py-3 rounded-lg mt-3"
          >
            <Text className="text-text-primary">Go Back</Text>
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
        <Text
          className="text-text-primary font-bold ml-2 flex-1"
          numberOfLines={1}
        >
          {data.title}
        </Text>
      </View>

      <View className="px-4 py-2 border-b border-border-default">
        <View className="self-start flex-row rounded-lg border border-border-default bg-bg-surface overflow-hidden">
          {[
            { key: "basic", label: "Basic" },
            { key: "core", label: "Core" },
            { key: "full", label: "Full" },
          ].map((option) => {
            const active = collocationDisplayLevel === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() =>
                  setCollocationDisplayLevel(
                    option.key as "basic" | "core" | "full",
                  )
                }
                className={`px-3 py-1.5 ${active ? "bg-accent-primary/20" : "bg-transparent"}`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase ${active ? "text-accent-primary" : "text-text-muted"}`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {tracks.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-3 border-b border-border-default"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {tracks.map((item) => (
            <TouchableOpacity
              key={item.index}
              onPress={() => setTrack(item.index)}
              className={`mr-2 px-3 py-2 rounded-lg border ${
                item.index === track
                  ? "bg-accent-primary/20 border-accent-primary"
                  : "bg-bg-surface border-border-default"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  item.index === track
                    ? "text-accent-primary"
                    : "text-text-secondary"
                }`}
              >
                {item.title || `Track ${item.index + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View className="px-4 py-4 border-b border-border-default">
        <View className="flex-row justify-end mb-3">
          <TouchableOpacity
            className="px-3 py-2 rounded-lg border border-border-default bg-bg-surface"
            onPress={handleTranscribe}
            disabled={isTranscribing}
          >
            <Text className="text-text-secondary text-xs font-bold">
              {isTranscribing ? "TRANSCRIBING..." : "TRANSCRIBE"}
            </Text>
          </TouchableOpacity>
        </View>
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
            disabled={isBuffering}
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
            onPress={() => seekTo(currentTime + 15)}
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
          <Text className="text-text-muted text-center mt-10">
            No subtitle segments for this track.
          </Text>
        ) : (
          segments.map((segment, index) => (
            <TouchableOpacity
              key={`${segment.startTime}-${index}`}
              className={`p-3 rounded-lg mb-2 border ${
                index === activeSegmentIndex
                  ? "bg-accent-primary/10 border-accent-primary/30"
                  : "bg-bg-surface border-border-default"
              }`}
              onPress={() => seekTo(segment.startTime)}
            >
              <Text
                className={
                  index === activeSegmentIndex
                    ? "text-accent-primary"
                    : "text-text-secondary"
                }
              >
                {renderSegmentText(segment.text, index === activeSegmentIndex)}
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
