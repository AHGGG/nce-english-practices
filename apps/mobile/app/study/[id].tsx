import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useLocalSearchParams,
  useRouter,
  usePathname,
  Stack,
} from "expo-router";
import { useSentenceStudy } from "@nce/shared";
import { useWordExplainer } from "../../src/hooks/useWordExplainer"; // Use mobile-specific version
import {
  ChevronLeft,
  Play,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Zap,
  BookOpen,
  Brain,
} from "lucide-react-native";
import { DictionaryModal } from "../../src/components/DictionaryModal";
import { SimpleMarkdown } from "../../src/components/SimpleMarkdown";
import { useState, useRef, useCallback, useEffect } from "react";
import EventSource from "react-native-sse";
import { getApiBaseUrl } from "../../src/lib/platform-init";

const OverviewView = ({ data, isLoading, onStart }: any) => {
  // data.overview can be:
  // 1. An object with {summary_en, summary_zh, key_topics, difficulty_hint}
  // 2. data.overviewStream is raw JSON being streamed (not displayable)
  const overview = data?.overview;
  const hasOverview = overview && (overview.summary_en || overview.summary_zh);

  return (
    <View className="flex-1 p-6">
      <Text className="text-2xl font-serif font-bold text-text-primary mb-4">
        Overview
      </Text>
      <ScrollView className="flex-1 mb-6 bg-bg-surface p-4 rounded-xl border border-border-default">
        {isLoading && !hasOverview ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#00FF94" size="large" />
            <Text className="text-text-muted mt-4 text-sm">
              Generating overview...
            </Text>
          </View>
        ) : hasOverview ? (
          <View>
            <Text className="text-text-primary leading-relaxed text-base font-serif mb-4">
              {overview.summary_en}
            </Text>
            {overview.summary_zh && (
              <Text className="text-text-secondary leading-relaxed text-sm font-serif mb-4">
                {overview.summary_zh}
              </Text>
            )}
            {overview.key_topics && overview.key_topics.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-2">
                {overview.key_topics.map((topic: string, i: number) => (
                  <View
                    key={i}
                    className="bg-accent-primary/10 px-3 py-1 rounded-full"
                  >
                    <Text className="text-accent-primary text-xs">{topic}</Text>
                  </View>
                ))}
              </View>
            )}
            {overview.difficulty_hint && (
              <Text className="text-text-muted text-xs mt-4 italic">
                {overview.difficulty_hint}
              </Text>
            )}
          </View>
        ) : (
          <Text className="text-text-secondary leading-relaxed text-base font-serif">
            Loading article overview...
          </Text>
        )}
      </ScrollView>
      <TouchableOpacity
        className="bg-accent-primary py-4 rounded-full flex-row items-center justify-center"
        onPress={onStart}
        disabled={isLoading}
        style={{ opacity: isLoading ? 0.5 : 1 }}
      >
        <Play size={20} color="#050505" fill="#050505" />
        <Text className="text-bg-base font-bold ml-2 text-lg">
          START STUDYING
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const STAGE_CONFIG: any = {
  1: {
    color: "text-accent-success",
    borderColor: "border-accent-success",
    bgColor: "bg-accent-success",
    icon: Sparkles,
    label: "Vocabulary Check",
    bgLight: "bg-accent-success/10",
  },
  2: {
    color: "text-category-blue",
    borderColor: "border-category-blue",
    bgColor: "bg-category-blue",
    icon: Zap,
    label: "Structure Check",
    bgLight: "bg-category-blue/10",
  },
  3: {
    color: "text-category-indigo",
    borderColor: "border-category-indigo",
    bgColor: "bg-category-indigo",
    icon: BookOpen,
    label: "English Analysis",
    bgLight: "bg-category-indigo/10",
  },
  4: {
    color: "text-category-red",
    borderColor: "border-category-red",
    bgColor: "bg-category-red",
    icon: Brain,
    label: "Chinese Deep Dive",
    bgLight: "bg-category-red/10",
  },
};

const MobileExplanationCard = ({
  simplifiedText,
  simplifyStage,
  isSimplifying,
  onSimplifiedResponse,
}: any) => {
  const config = STAGE_CONFIG[simplifyStage] || STAGE_CONFIG[1];
  const Icon = config.icon;

  if (!simplifiedText && !isSimplifying) return null;

  return (
    <View className="mt-6 rounded-xl overflow-hidden border border-white/10 bg-bg-surface/80">
      {/* Header */}
      <View className="p-4 border-b border-white/5 flex-row justify-between items-center bg-bg-elevated/30">
        <View className="flex-row items-center gap-3">
          <View
            className={`p-2 rounded-lg bg-bg-base/40 border border-white/5 ${config.bgColor}`}
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <Icon size={16} color={getColorHex(config.color)} />
          </View>
          <View>
            <Text className={`font-bold uppercase text-xs ${config.color}`}>
              {config.label}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <Text className="text-xs text-text-muted">
                Stage {simplifyStage}/4
              </Text>
              <View className="w-1 h-1 rounded-full bg-text-muted" />
              <Text className="text-xs text-text-muted">AI Analysis</Text>
            </View>
          </View>
        </View>

        {isSimplifying && (
          <ActivityIndicator size="small" color={getColorHex(config.color)} />
        )}
      </View>

      {/* Content */}
      <View className="p-4 min-h-[100px]">
        {simplifiedText ? (
          <SimpleMarkdown style={{ color: "#E0E0E0", fontSize: 16 }}>
            {simplifiedText}
          </SimpleMarkdown>
        ) : (
          isSimplifying && (
            <View className="items-center justify-center py-8 opacity-50">
              <Text className="font-mono text-xs uppercase tracking-widest text-text-muted">
                Processing Context...
              </Text>
            </View>
          )
        )}
      </View>

      {/* Actions (Integrated) */}
      {!isSimplifying && simplifiedText && (
        <View className="p-4 border-t border-white/5 flex-row gap-3 justify-center">
          <TouchableOpacity
            onPress={() => onSimplifiedResponse(false)}
            disabled={simplifyStage >= 4}
            className={`flex-1 py-3 px-4 rounded-lg border flex-row justify-center items-center ${
              simplifyStage < 4
                ? "border-white/10 bg-bg-base/20"
                : "border-white/5 bg-transparent opacity-50"
            }`}
          >
            <HelpCircle
              size={16}
              color={simplifyStage < 4 ? "#9CA3AF" : "#4B5563"}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`font-bold uppercase text-xs ${
                simplifyStage < 4 ? "text-text-secondary" : "text-text-muted"
              }`}
            >
              {simplifyStage < 4 ? "Still Unclear" : "Max Level"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onSimplifiedResponse(true)}
            className={`flex-1 py-3 px-4 rounded-lg flex-row justify-center items-center ${config.bgColor}`}
          >
            <CheckCircle size={16} color="#121212" style={{ marginRight: 8 }} />
            <Text className="font-bold uppercase text-xs text-bg-base">
              {simplifyStage === 4 ? "Understood" : "Got it"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Helper to extract hex color from tailwind class (approximate)
const getColorHex = (className: string) => {
  if (className.includes("accent-success")) return "#00FF94";
  if (className.includes("category-blue")) return "#60A5FA";
  if (className.includes("category-indigo")) return "#818CF8";
  if (className.includes("category-red")) return "#F87171";
  return "#E0E0E0";
};

const StudyingView = ({
  sentence,
  index,
  total,
  onWordClick,
  onClear,
  onUnclear,
  isSimplifying,
  simplifiedText,
  simplifyStage,
  onUnclearResponse,
}: any) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (simplifiedText && simplifiedText.length > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [simplifiedText]);

  return (
    <View className="flex-1">
      {/* Progress Info Header */}
      <View className="px-6 py-3 flex-row justify-between items-center border-b border-white/5">
        <Text className="text-xs font-bold text-text-muted uppercase tracking-wider">
          Sentence {index + 1} / {total}
        </Text>
        <View className="h-1 flex-1 ml-4 bg-bg-elevated rounded-full overflow-hidden">
          <View
            className="h-full bg-accent-primary"
            style={{ width: `${(index / Math.max(total, 1)) * 100}%` }}
          />
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 120,
          flexGrow: 1,
          justifyContent:
            !isSimplifying && !simplifiedText ? "center" : "flex-start",
        }}
        showsVerticalScrollIndicator={true}
      >
        <View className="px-6 py-6">
          <View className="bg-bg-surface p-6 rounded-2xl border border-border-default">
            <Text className="text-xl font-serif leading-relaxed text-text-primary">
              {sentence?.text?.split(" ").map((word: string, i: number) => (
                <Text
                  key={i}
                  onPress={() => onWordClick(word)}
                  className="active:text-accent-primary active:bg-accent-primary/10"
                >
                  {word}{" "}
                </Text>
              ))}
            </Text>
          </View>

          <MobileExplanationCard
            simplifiedText={simplifiedText}
            simplifyStage={simplifyStage}
            isSimplifying={isSimplifying}
            onSimplifiedResponse={onUnclearResponse}
          />
        </View>
      </ScrollView>

      {/* Bottom Actions - Hidden when explaining */}
      {!isSimplifying && !simplifiedText && (
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-bg-base border-t border-border-default">
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-bg-elevated py-4 rounded-xl items-center border border-border-default flex-row justify-center"
              onPress={onUnclear}
            >
              <HelpCircle size={20} color="#E0E0E0" className="mr-2" />
              <Text className="text-text-primary font-bold uppercase text-sm">
                Unclear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-accent-primary py-4 rounded-xl items-center flex-row justify-center"
              onPress={onClear}
            >
              <CheckCircle size={20} color="#121212" className="mr-2" />
              <Text className="text-bg-base font-bold uppercase text-sm">
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const CompletedView = ({ stats, onFinish }: any) => (
  <View className="flex-1 p-6 items-center justify-center">
    <CheckCircle size={64} color="#00FF94" />
    <Text className="text-2xl font-serif font-bold text-text-primary mt-6 mb-2">
      Session Complete!
    </Text>

    <View className="flex-row gap-4 mt-8 w-full">
      <View className="flex-1 bg-bg-surface p-4 rounded-xl items-center border border-border-default">
        <Text className="text-3xl font-mono font-bold text-accent-primary">
          {stats?.clear_count || 0}
        </Text>
        <Text className="text-text-muted text-xs uppercase mt-1">Clear</Text>
      </View>
      <View className="flex-1 bg-bg-surface p-4 rounded-xl items-center border border-border-default">
        <Text className="text-3xl font-mono font-bold text-accent-warning">
          {stats?.unclear_count || 0}
        </Text>
        <Text className="text-text-muted text-xs uppercase mt-1">Unclear</Text>
      </View>
    </View>

    <TouchableOpacity
      className="bg-bg-elevated w-full py-4 rounded-full mt-12 items-center border border-border-default"
      onPress={onFinish}
    >
      <Text className="text-text-primary font-bold">Return to Library</Text>
    </TouchableOpacity>
  </View>
);

function useStreamingSimplify() {
  const [simplifiedText, setSimplifiedText] = useState("");
  const [simplifyStage, setSimplifyStage] = useState(0); // 0 = no simplification yet
  const [isSimplifying, setIsSimplifying] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const simplifiedTextRef = useRef("");

  const simplify = useCallback(
    async (
      params: {
        sentence: string;
        simplify_type: string;
        stage: number;
        prev_sentence?: string;
        next_sentence?: string;
      },
      onUpdate: (text: string, stage: number, done: boolean) => void,
    ) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.removeAllEventListeners();
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsSimplifying(true);
      simplifiedTextRef.current = "";
      setSimplifiedText("");
      setSimplifyStage(params.stage);

      const url = `${getApiBaseUrl()}/api/sentence-study/simplify`;
      console.log("[streaming-simplify] Creating SSE for:", url);

      const es = new EventSource(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(params),
        pollingInterval: 0,
      });

      eventSourceRef.current = es;

      es.addEventListener("open", () => {
        console.log("[streaming-simplify] Connection opened");
      });

      es.addEventListener("message", (event) => {
        const data = event.data;
        if (!data) return;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "chunk") {
            console.log(
              "[streaming-simplify] Received chunk:",
              parsed.content?.substring(0, 50),
            );
            const newText = (simplifiedTextRef.current || "") + parsed.content;
            simplifiedTextRef.current = newText;
            setSimplifiedText(newText);
            onUpdate(newText, params.stage, false);
          } else if (parsed.type === "done") {
            console.log("[streaming-simplify] Done, stage:", parsed.stage);
            const finalStage = parsed.stage || params.stage;
            setSimplifyStage(finalStage);
            setIsSimplifying(false);
            onUpdate(simplifiedTextRef.current || "", finalStage, true);
          }
        } catch (e) {
          console.error("[streaming-simplify] Parse error:", e);
        }
      });

      es.addEventListener("error", (event: any) => {
        console.error("[streaming-simplify] Error:", event.message);
        setIsSimplifying(false);
      });

      es.addEventListener("close" as any, () => {
        console.log("[streaming-simplify] Connection closed");
        setIsSimplifying(false);
      });
    },
    [],
  );

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    simplifiedTextRef.current = "";
    setSimplifiedText("");
    setSimplifyStage(0); // Reset to 0 = no simplification
    setIsSimplifying(false);
  }, []);

  return {
    simplifiedText,
    simplifyStage,
    isSimplifying,
    simplify,
    reset,
  };
}

// --- Streaming Overview Hook using react-native-sse ---
function useStreamingOverview() {
  const [overviewStream, setOverviewStream] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const overviewRef = useRef("");

  const fetchOverview = useCallback(
    async (
      title: string,
      fullText: string,
      totalSentences: number,
      onUpdate: (stream: string, done: boolean) => void,
    ) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.removeAllEventListeners();
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsLoading(true);
      overviewRef.current = "";
      setOverviewStream("");
      setOverview(null);

      const url = `${getApiBaseUrl()}/api/sentence-study/overview`;
      console.log("[streaming-overview] Creating SSE for:", url);

      const es = new EventSource(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          title,
          full_text: fullText,
          total_sentences: totalSentences,
        }),
        pollingInterval: 0,
      });

      eventSourceRef.current = es;

      es.addEventListener("open", () => {
        console.log("[streaming-overview] Connection opened");
      });

      es.addEventListener("message", (event) => {
        const data = event.data;
        if (!data) return;

        try {
          const parsed = JSON.parse(data);
          console.log("[streaming-overview] Message type:", parsed.type);

          if (parsed.type === "chunk") {
            const newText = (overviewRef.current || "") + parsed.content;
            overviewRef.current = newText;
            setOverviewStream(newText);
            onUpdate(newText, false);
          } else if (parsed.type === "done") {
            console.log(
              "[streaming-overview] Done, has overview:",
              !!parsed.overview,
              "cached:",
              parsed.cached,
            );
            // parsed.overview is the full object {summary_en, summary_zh, ...}
            if (parsed.overview) {
              setOverview({ overview: parsed.overview });
            }
            setIsLoading(false);
            onUpdate(overviewRef.current, true);
            // Close connection after done
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
          } else if (parsed.type === "error") {
            console.error("[streaming-overview] Server error:", parsed.message);
            setIsLoading(false);
          }
        } catch (e) {
          console.error("[streaming-overview] Parse error:", e, "data:", data);
          setIsLoading(false);
        }
      });

      es.addEventListener("error", (event: any) => {
        console.error("[streaming-overview] Error:", event.message);
        setIsLoading(false);
      });

      es.addEventListener("close" as any, () => {
        console.log("[streaming-overview] Connection closed");
        setIsLoading(false);
      });
    },
    [],
  );

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    overviewRef.current = "";
    setOverviewStream("");
    setOverview(null);
    setIsLoading(false);
  }, []);

  return {
    overviewStream,
    overview,
    isLoading,
    fetchOverview,
    reset,
  };
}

export default function StudyScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const pathname = usePathname();

  console.log("[StudyScreen] Local params:", JSON.stringify(params));
  console.log("[StudyScreen] Pathname:", pathname);

  let sourceId: string | undefined;

  if (params.id && params.id !== "undefined") {
    sourceId = decodeURIComponent(params.id);
  } else {
    const match = pathname.match(/^\/study\/(.+)$/);
    if (match && match[1]) {
      sourceId = decodeURIComponent(match[1]);
      console.log("[StudyScreen] Extracted sourceId from path:", sourceId);
    }
  }

  console.log("[StudyScreen] Final sourceId:", sourceId);

  if (!sourceId) {
    return (
      <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-accent-warning text-center mb-4">
            Missing article ID
          </Text>
          <Text className="text-text-muted text-center mb-6">
            Could not load the article. Please try again from the library.
          </Text>
          <TouchableOpacity
            className="bg-accent-primary/10 px-6 py-3 rounded-full border border-accent-primary/30"
            onPress={() => router.replace("/(tabs)/library")}
          >
            <Text className="text-accent-primary font-bold">Go to Library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    view,
    article,
    currentSentence,
    currentIndex,
    totalSentences,
    startStudying,
    handleClear,
    studyHighlights,
  } = useSentenceStudy(sourceId);

  // Use mobile-specific word explainer
  const explainer = useWordExplainer();

  const {
    simplifiedText,
    simplifyStage,
    isSimplifying,
    simplify: streamSimplify,
    reset: resetSimplify,
  } = useStreamingSimplify();

  const {
    overviewStream,
    overview: streamingOverview,
    isLoading: isLoadingOverview,
    fetchOverview: streamOverview,
  } = useStreamingOverview();

  const [modalVisible, setModalVisible] = useState(false);

  // Fetch overview when entering OVERVIEW view
  const overviewRequested = useRef(false);
  useEffect(() => {
    console.log(
      "[StudyScreen] useEffect Overview: view=",
      view,
      "article=",
      article?.title?.substring(0, 30),
    );

    if (view === "OVERVIEW" && article?.title && article?.full_text) {
      if (!overviewRequested.current) {
        overviewRequested.current = true;
        console.log("[StudyScreen] Triggering streamOverview...");
        streamOverview(
          article.title,
          article.full_text,
          totalSentences || 0,
          (stream, done) => {
            console.log(
              "[StudyScreen] Overview stream:",
              done ? "done" : "streaming...",
            );
          },
        );
      }
    } else if (view !== "OVERVIEW") {
      overviewRequested.current = false;
    }
  }, [
    view,
    article?.title,
    article?.full_text,
    totalSentences,
    streamOverview,
  ]);

  const onWordClickWrapper = (word: string) => {
    console.log(
      "[StudyScreen] onWordClickWrapper:",
      word,
      "sentence:",
      currentSentence?.text,
    );
    explainer.handleWordClick(word, currentSentence?.text || "");
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    explainer.closeInspector();
  };

  const handleUnclear = useCallback(() => {
    if (!currentSentence) return;

    // If no simplification yet (stage 0), start at stage 1
    // Otherwise, go to next stage
    const nextStage = simplifyStage === 0 ? 1 : Math.min(simplifyStage + 1, 4);
    console.log(
      "[StudyScreen] handleUnclear: currentStage=",
      simplifyStage,
      "nextStage=",
      nextStage,
    );

    const params = {
      sentence: currentSentence.text,
      simplify_type: "meaning",
      stage: nextStage,
      prev_sentence: null,
      next_sentence: null,
    };

    streamSimplify(params, (text, stage, done) => {
      console.log(
        "[StudyScreen] Simplify update: text.length=",
        text.length,
        "stage=",
        stage,
        "done=",
        done,
      );
    });
  }, [currentSentence, simplifyStage, streamSimplify]);

  // Wrapped handleClear to reset simplification state
  const handleClearWithReset = useCallback(async () => {
    try {
      await handleClear();
      resetSimplify();
    } catch (e) {
      console.error("[StudyScreen] handleClearWithReset failed:", e);
    }
  }, [handleClear, resetSimplify]);

  const handleUnclearResponse = useCallback(
    async (gotIt: boolean) => {
      console.log(
        "[StudyScreen] handleUnclearResponse: gotIt=",
        gotIt,
        "simplifyStage=",
        simplifyStage,
      );

      if (gotIt) {
        console.log("[StudyScreen] Recording clear and advancing...");
        try {
          await handleClear();
          // Reset simplification state when moving to next sentence
          resetSimplify();
        } catch (e) {
          console.error("[StudyScreen] handleClear failed:", e);
        }
      } else {
        console.log("[StudyScreen] Going to next stage...");
        handleUnclear();
      }
    },
    [handleClear, handleUnclear, simplifyStage, resetSimplify],
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-base" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="h-14 flex-row items-center px-4 border-b border-border-default bg-bg-surface">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ChevronLeft color="#E0E0E0" size={24} />
        </TouchableOpacity>
        <Text className="text-text-primary font-bold ml-2 text-sm">
          Sentence Study
        </Text>
      </View>

      <View className="flex-1">
        {view === "LOADING" && (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator color="#00FF94" size="large" />
          </View>
        )}

        {view === "OVERVIEW" && (
          <OverviewView
            data={streamingOverview || { overviewStream }}
            isLoading={isLoadingOverview}
            onStart={startStudying}
          />
        )}

        {view === "STUDYING" && (
          <StudyingView
            sentence={currentSentence}
            index={currentIndex}
            total={totalSentences}
            onWordClick={onWordClickWrapper}
            onClear={handleClearWithReset}
            onUnclear={handleUnclear}
            isSimplifying={isSimplifying}
            simplifiedText={simplifiedText}
            simplifyStage={simplifyStage}
            onUnclearResponse={handleUnclearResponse}
          />
        )}

        {view === "COMPLETED" && (
          <CompletedView
            stats={studyHighlights}
            onFinish={() => router.replace("/(tabs)/library")}
          />
        )}
      </View>

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
        onMarkAsKnown={explainer.closeInspector}
        onPlayAudio={() => {}}
        currentSentenceContext={""}
      />
    </SafeAreaView>
  );
}
