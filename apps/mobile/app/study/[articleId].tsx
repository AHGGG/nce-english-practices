import React, { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { UniversalWebView } from "../../src/components/UniversalWebView";
import {
  useArticleDetail,
  extractSentencesFromBlocks,
} from "../../src/modules/study/useStudyData";
import { useReadingTracker } from "@nce/shared";
import { useWordExplainer } from "@nce/shared";
import { DictionaryModal } from "../../src/components/DictionaryModal";
import {
  ChevronLeft,
  Zap,
  GraduationCap,
  CheckCheck,
} from "lucide-react-native";
import { generateArticleHTML } from "../../src/utils/htmlGenerator";

export default function ArticleScreen() {
  const { articleId } = useLocalSearchParams();
  const router = useRouter();
  const { article, isLoading, error } = useArticleDetail(articleId as string);
  const webViewRef = useRef<any>(null);

  // Reading Tracker
  const sentences = extractSentencesFromBlocks(article?.blocks || []);
  const tracker = useReadingTracker({
    articleId: article?.id ? String(article.id) : "",
    articleTitle: article?.title || "",
    sentences,
    sourceType: (article as any)?.source_type || "epub",
  });

  const {
    handleWordClick,
    inspectorData,
    contextExplanation,
    isInspecting,
    isExplaining,
  } = useWordExplainer();

  const [modalVisible, setModalVisible] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);

  // Modal trigger
  useEffect(() => {
    if (inspectorData || isInspecting) {
      setModalVisible(true);
    }
  }, [inspectorData, isInspecting]);

  // Handle WebView Message (Bridge)
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "wordClick") {
        tracker.onWordClick();
        handleWordClick(data.payload.word, data.payload.sentence);
        setModalVisible(true);
      } else if (data.type === "sentenceView") {
        tracker.onSentenceView(data.payload);
      }
    } catch (e) {
      console.error("Failed to parse WebView message", e);
    }
  };

  // Toggle Highlights via JS injection
  useEffect(() => {
    if (webViewRef.current) {
      const js = `
            if (window.updateHighlights) {
                window.updateHighlights(${showHighlights});
            }
            true;
          `;
      webViewRef.current.injectJavaScript(js);
    }
  }, [showHighlights]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base">
        <ActivityIndicator size="large" color="#00FF94" />
        <Text className="text-text-muted mt-4 font-mono text-xs uppercase tracking-widest">
          Loading Article...
        </Text>
      </View>
    );
  }

  if (error || !article) {
    return (
      <View className="flex-1 justify-center items-center bg-bg-base px-4">
        <Text className="text-accent-danger text-lg mb-4 font-mono">
          ERROR: {error || "Article not found"}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-bg-surface border border-border px-6 py-3 rounded-lg"
        >
          <Text className="text-text-primary font-bold uppercase tracking-wider text-xs">
            Return to Base
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Navbar */}
      <View className="h-14 border-b border-border flex-row items-center px-4 bg-bg-surface z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 flex-row items-center"
        >
          <ChevronLeft color="#888888" size={20} />
          <Text className="text-text-secondary font-mono font-bold text-xs uppercase tracking-wider ml-1">
            Library
          </Text>
        </TouchableOpacity>

        <View className="flex-1 items-end">
          <Text className="text-text-muted font-mono text-[10px] uppercase tracking-widest">
            {article.metadata?.filename?.split(".")[0] || "Unknown Source"}
          </Text>
        </View>
      </View>

      {/* Toolbar */}
      <View className="h-12 border-b border-border bg-bg-surface/50 flex-row items-center justify-between px-4 z-10">
        {/* Left: Toggles */}
        <View className="flex-row items-center space-x-4 gap-4">
          <TouchableOpacity
            onPress={() => setShowHighlights(!showHighlights)}
            className={`p-2 rounded border ${showHighlights ? "border-accent-primary bg-accent-primary/10" : "border-border"}`}
          >
            <Zap size={16} color={showHighlights ? "#00FF94" : "#666666"} />
          </TouchableOpacity>

          <TouchableOpacity className="p-2 rounded border border-border">
            <CheckCheck size={16} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* Right: Actions */}
        <View>
          <TouchableOpacity
            className="flex-row items-center gap-2 px-3 py-1.5 border border-border bg-bg-elevated rounded hover:bg-bg-surface"
            onPress={() => {
              router.push(`/study/sentence/${articleId}`);
            }}
          >
            <GraduationCap size={14} color="#E0E0E0" />
            <Text className="text-text-primary font-bold text-[10px] uppercase tracking-wider">
              Deep Study
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView Reader */}
      <View className="flex-1 bg-bg-base">
        <UniversalWebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: generateArticleHTML(article, showHighlights) }}
          onMessage={handleWebViewMessage}
          style={{ backgroundColor: "#050505", flex: 1 }}
          containerStyle={{ backgroundColor: "#050505" }}
          showsVerticalScrollIndicator={false}
        />
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
