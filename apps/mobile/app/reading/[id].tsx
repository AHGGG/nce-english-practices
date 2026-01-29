import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Modal,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useArticleReader } from "@nce/shared";
import useWordExplainer from "../../src/hooks/useWordExplainer";
import { proficiencyApi } from "@nce/api";
import { useSettingsStore } from "@nce/store";
import { UniversalWebView } from "../../src/components/UniversalWebView";
import { generateArticleHTML } from "../../src/utils/htmlGenerator";
import { DictionaryModal } from "../../src/components/DictionaryModal";
import { SentenceInspectorModal } from "../../src/components/SentenceInspectorModal";
import ImageLightbox from "../../src/components/ImageLightbox";
import { getApiBaseUrl } from "../../src/lib/platform-init";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  MoreHorizontal,
  Settings,
  CheckCheck,
  X,
} from "lucide-react-native";
import { WebViewMessageEvent } from "react-native-webview";
import { Audio } from "expo-av";

const HIGHLIGHT_OPTIONS = [
  { label: "All Unknown", min: 0, max: 99999 },
  { label: "High Freq (1-3k)", min: 0, max: 3000 },
  { label: "Mid Freq (3-8k)", min: 3000, max: 8000 },
  { label: "Low Freq (8k+)", min: 8000, max: 99999 },
];

export default function ReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Hooks
  const { article, isLoading, tracker, refetch } = useArticleReader(id);
  const explainer = useWordExplainer();
  const settings = useSettingsStore();

  // State
  const [showHighlights, setShowHighlights] = useState(true);
  const [highlightOptionIndex, setHighlightOptionIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Sentence Inspector State
  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);

  // Image Lightbox State
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Audio Ref
  const audioRef = useRef<Audio.Sound | null>(null);

  const webViewRef = useRef<any>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, []);

  // Generate HTML
  const htmlSource = article
    ? {
        html: generateArticleHTML(
          article,
          showHighlights,
          getApiBaseUrl(),
          HIGHLIGHT_OPTIONS[highlightOptionIndex],
        ),
      }
    : undefined;

  // Handle WebView Messages
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case "wordClick":
          const { word, sentence } = data.payload;
          handleWordClick(word, sentence);
          break;
        case "sentenceClick":
          const { text } = data.payload;
          handleSentenceClick(text);
          break;
        case "imageClick":
          if (data.payload.src) {
            setLightboxImage(data.payload.src);
            setLightboxVisible(true);
          }
          break;
        case "sentenceView":
          tracker.onSentenceView(data.payload);
          break;
      }
    } catch (e) {
      console.warn("Failed to parse WebView message", e);
    }
  };

  const handleWordClick = async (word: string, sentence: string) => {
    tracker.onWordClick();
    setModalVisible(true);

    if (settings.autoPronounce) {
      playTtsAudio(word);
    }

    await explainer.handleWordClick(word, sentence);
  };

  const handleSentenceClick = (text: string) => {
    setSelectedSentence(text);
    setInspectorVisible(true);
  };

  const playTtsAudio = useCallback(async (text: string) => {
    if (!text) return;
    if (audioRef.current) {
      await audioRef.current.unloadAsync();
    }
    try {
      const url = `${getApiBaseUrl()}/api/tts?text=${encodeURIComponent(text)}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      audioRef.current = sound;
    } catch (e) {
      console.error("TTS playback failed", e);
    }
  }, []);

  const handleMarkAsKnown = useCallback(async (word: string) => {
    const lowerWord = word.toLowerCase();
    try {
      await proficiencyApi.updateWordStatus(lowerWord, "mastered");
      handleCloseModal();
    } catch (e) {
      console.error("Failed to mark as known", e);
      Alert.alert("Error", "Failed to mark word as known");
    }
  }, []);

  const handleCloseModal = () => {
    setModalVisible(false);
    explainer.closeInspector();
  };

  const handleSweep = async () => {
    if (!article?.highlightSet) return;

    // Calculate words to sweep based on current filter
    const filter = HIGHLIGHT_OPTIONS[highlightOptionIndex];
    const wordsToSweep = Object.keys(article.highlightSet).filter((word) => {
      const rank = article.highlightSet![word];
      return rank >= filter.min && rank < filter.max;
    });

    if (wordsToSweep.length === 0) {
      Alert.alert("No Words", "No words match current filter to sweep.");
      return;
    }

    Alert.alert(
      "Sweep Words",
      `Mark ${wordsToSweep.length} visible highlights as Known?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sweep",
          style: "destructive",
          onPress: async () => {
            setSettingsVisible(false);
            try {
              await proficiencyApi.sweep(wordsToSweep, []);
              // Refresh article to clear highlights
              refetch();
            } catch (e) {
              console.error(e);
              Alert.alert("Error", "Failed to sweep words.");
            }
          },
        },
      ],
    );
  };

  if (isLoading || !article) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator size="large" color="#00FF94" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <View className="h-14 flex-row items-center justify-between px-4 border-b border-border bg-bg-surface z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>

        <Text
          className="text-text-primary font-bold font-sans text-sm flex-1 mx-2"
          numberOfLines={1}
        >
          {article.title}
        </Text>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="p-2 mr-1"
            onPress={() =>
              router.push(`/study/${encodeURIComponent(article.source_id)}`)
            }
          >
            <Text className="text-accent-primary font-bold text-xs">STUDY</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="p-2 -mr-2"
            onPress={() => setSettingsVisible(true)}
          >
            <Settings color="#E0E0E0" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView */}
      <View className="flex-1 bg-bg-base">
        <UniversalWebView
          ref={webViewRef}
          source={htmlSource}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          style={{ backgroundColor: "#050505" }}
          containerStyle={{ backgroundColor: "#050505" }}
        />
      </View>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-bg-surface rounded-t-3xl p-6 border-t border-border-default">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold font-serif text-text-primary">
                Reading Settings
              </Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Toggle Highlights */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-text-secondary text-base">
                Show Highlights
              </Text>
              <TouchableOpacity
                onPress={() => setShowHighlights(!showHighlights)}
                className={`w-12 h-7 rounded-full p-1 ${showHighlights ? "bg-accent-primary" : "bg-bg-elevated border border-border-default"}`}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white shadow-sm ${showHighlights ? "self-end" : "self-start"}`}
                />
              </TouchableOpacity>
            </View>

            {/* Filter Options */}
            <Text className="text-text-muted text-xs font-bold uppercase mb-3">
              Highlight Filter
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {HIGHLIGHT_OPTIONS.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setHighlightOptionIndex(i)}
                  className={`px-3 py-2 rounded-lg border ${
                    highlightOptionIndex === i
                      ? "bg-accent-primary/10 border-accent-primary"
                      : "bg-bg-elevated border-border-default"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      highlightOptionIndex === i
                        ? "text-accent-primary"
                        : "text-text-secondary"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sweep Action */}
            <TouchableOpacity
              onPress={handleSweep}
              className="bg-bg-elevated border border-border-default p-4 rounded-xl flex-row items-center justify-center mb-4"
            >
              <CheckCheck size={20} color="#00FF94" />
              <Text className="text-text-primary font-bold ml-2">
                Sweep Visible Highlights
              </Text>
            </TouchableOpacity>

            <Text className="text-text-muted text-xs text-center">
              Marks all currently highlighted words as known.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Dictionary Modal */}
      <DictionaryModal
        visible={modalVisible}
        onClose={handleCloseModal}
        inspectorData={explainer.inspectorData}
        contextExplanation={explainer.contextExplanation}
        isInspecting={explainer.isInspecting}
        isExplaining={explainer.isExplaining}
        selectedWord={explainer.selectedWord}
        isPhrase={explainer.isPhrase}
        explainStyle={explainer.explainStyle}
        generatedImage={explainer.generatedImage}
        isGeneratingImage={explainer.isGeneratingImage}
        imagePrompt={explainer.imagePrompt}
        onExplainStyle={explainer.changeExplainStyle}
        onGenerateImage={explainer.generateImage}
        onMarkAsKnown={handleMarkAsKnown}
        onPlayAudio={playTtsAudio}
        currentSentenceContext={explainer.currentSentenceContext}
      />

      {/* Sentence Inspector Modal */}
      <SentenceInspectorModal
        visible={inspectorVisible}
        onClose={() => setInspectorVisible(false)}
        sentence={selectedSentence}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        visible={lightboxVisible}
        imageUrl={lightboxImage}
        onClose={() => setLightboxVisible(false)}
      />
    </SafeAreaView>
  );
}
