import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Share,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useArticleReader, useWordExplainer } from "@nce/shared";
import { UniversalWebView } from "../../src/components/UniversalWebView";
import { generateArticleHTML } from "../../src/utils/htmlGenerator";
import { DictionaryModal } from "../../src/components/DictionaryModal";
import { useRef, useState, useEffect } from "react";
import { ChevronLeft, MoreHorizontal } from "lucide-react-native";
import { WebViewMessageEvent } from "react-native-webview";

export default function ReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Hooks
  const { article, isLoading, tracker } = useArticleReader(id);
  const explainer = useWordExplainer();

  // State
  const [showHighlights, setShowHighlights] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const webViewRef = useRef<any>(null);

  // Generate HTML
  const htmlSource = article
    ? { html: generateArticleHTML(article, showHighlights) }
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
    // Use EPUB ID logic (e.g., epub:filename:chapter)
    await explainer.handleWordClick(word, sentence);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    explainer.closeInspector();
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
          className="text-text-primary font-bold font-sans text-sm"
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
            onPress={() => {
              // Toggle highlights or show menu
              setShowHighlights(!showHighlights);
              // Inject JS to update highlights without reload
              webViewRef.current?.injectJavaScript(`
                    window.updateHighlights(${!showHighlights});
                    true;
                  `);
            }}
          >
            <MoreHorizontal color="#E0E0E0" size={24} />
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

      {/* Dictionary Modal */}
      <DictionaryModal
        visible={modalVisible}
        onClose={handleCloseModal}
        inspectorData={explainer.inspectorData}
        contextExplanation={explainer.contextExplanation}
        isInspecting={explainer.isInspecting}
        isExplaining={explainer.isExplaining}
      />
    </SafeAreaView>
  );
}
